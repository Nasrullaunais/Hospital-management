import mongoose from 'mongoose';
import { Invoice } from './invoice.model.js';
import { User } from '../auth/auth.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { Dispense } from '../dispensing/dispense.model.js';
import { WardAssignment } from '../wardAssignments/wardAssignment.model.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface PendingBillingPatient {
  patientId: string;
  patientName: string;
  patientEmail: string;
  unbilledCount: number;
  unbilledSources: string[];
  discharged: boolean;
  wardName: string;
  lastActivity: string;
}

// ── Service ─────────────────────────────────────────────────────────────────────

export async function getPendingBillingPatients(): Promise<PendingBillingPatient[]> {
  // ── Step 1: Discharged patients with ward info ─────────────────────────────
  const dischargedAssignments = await WardAssignment.find({ status: 'discharged' })
    .populate('patientId', 'name email')
    .populate('wardId', 'name')
    .sort({ actualDischarge: -1 })
    .lean();

  // ── Step 2: Patients with unbilled dispensings ─────────────────────────────
  const unbilledDispensingPatientIds = (
    await Dispense.distinct('patientId', {
      invoiceId: null,
      status: { $in: ['fulfilled', 'partial'] },
    })
  ).map((id) => id.toString());

  // ── Step 3: Appointments completed but not yet invoiced ────────────────────
  const invoicedAppts = await Invoice.find({ appointmentId: { $ne: null } }, 'appointmentId').lean();
  const invoicedApptIdSet = new Set(
    invoicedAppts
      .map((i) => i.appointmentId)
      .filter(Boolean)
      .map((id) => id!.toString()),
  );

  const unbilledApptPatientIds = (
    await Appointment.distinct('patientId', {
      status: 'Completed',
      _id: { $nin: [...invoicedApptIdSet].map((id) => new mongoose.Types.ObjectId(id)) },
    })
  ).map((id) => id.toString());

  // ── Step 4: Build unique patient set + discharged ward info map ────────────
  const dischargedInfoMap = new Map<string, { wardName: string; actualDischarge: Date }>();
  const allPatientIds = new Set<string>();

  interface LeanPopulatedDoc { _id: mongoose.Types.ObjectId }
  interface LeanWardDoc { name?: string }

  for (const assignment of dischargedAssignments) {
    const patient = assignment.patientId as LeanPopulatedDoc | undefined;
    if (!patient) continue;
    const pid = patient._id.toString();
    const ward = assignment.wardId as LeanWardDoc | undefined;

    if (!dischargedInfoMap.has(pid)) {
      dischargedInfoMap.set(pid, {
        wardName: ward?.name || 'Unknown Ward',
        actualDischarge: assignment.actualDischarge || assignment.updatedAt,
      });
    }
    allPatientIds.add(pid);
  }

  for (const id of unbilledDispensingPatientIds) allPatientIds.add(id);
  for (const id of unbilledApptPatientIds) allPatientIds.add(id);

  // ── Step 5: Batch queries to avoid N+1 ───────────────────────────────────────
  const patientObjectIds = [...allPatientIds].map((id) => new mongoose.Types.ObjectId(id));

  // Batch: fetch all patient users
  const patientUsers = await User.find({ _id: { $in: patientObjectIds } }, 'name email createdAt').lean();
  const userMap = new Map(patientUsers.map((u) => [u._id.toString(), u]));

  // Batch: count unbilled dispensings per patient
  const dispensingCounts = await Dispense.aggregate([
    { $match: { patientId: { $in: patientObjectIds }, invoiceId: null, status: { $in: ['fulfilled', 'partial'] } } },
    { $group: { _id: '$patientId', count: { $sum: 1 } } },
  ]);
  const dispensingCountMap = new Map(dispensingCounts.map((d) => [d._id.toString(), d.count]));

  // Batch: count unbilled completed appointments per patient
  const apptCounts = await Appointment.aggregate([
    {
      $match: {
        patientId: { $in: patientObjectIds },
        status: 'Completed',
        _id: { $nin: [...invoicedApptIdSet].map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    { $group: { _id: '$patientId', count: { $sum: 1 } } },
  ]);
  const apptCountMap = new Map(apptCounts.map((a) => [a._id.toString(), a.count]));

  // Batch: latest ward assignment per patient
  const latestAssignments = await WardAssignment.aggregate([
    { $match: { patientId: { $in: patientObjectIds } } },
    { $sort: { updatedAt: -1 } },
    { $group: { _id: '$patientId', doc: { $first: '$$ROOT' } } },
  ]);
  const assignmentMap = new Map(
    latestAssignments.map((a) => [a._id.toString(), a.doc]),
  );

  // ── Step 6: Build result ─────────────────────────────────────────────────────
  const result: PendingBillingPatient[] = [];

  for (const patientId of allPatientIds) {
    const user = userMap.get(patientId);
    if (!user) continue;

    const unbilledDispensingCount = dispensingCountMap.get(patientId) ?? 0;
    const unbilledApptCount = apptCountMap.get(patientId) ?? 0;
    const latestAssignment = assignmentMap.get(patientId) as (typeof latestAssignments)[0]['doc'] | undefined;
    const dischargedInfo = dischargedInfoMap.get(patientId);

    const unbilledSources: string[] = [];
    if (unbilledDispensingCount > 0) unbilledSources.push('dispensing');
    if (unbilledApptCount > 0) unbilledSources.push('appointment');
    if (dischargedInfo) unbilledSources.push('ward');

    const totalUnbilled = unbilledDispensingCount + unbilledApptCount + (dischargedInfo ? 1 : 0);

    const lastActivity =
      dischargedInfo?.actualDischarge?.toISOString() ||
      (latestAssignment?.actualDischarge as Date | undefined)?.toISOString() ||
      (user.createdAt as Date | undefined)?.toISOString() ||
      new Date().toISOString();

    const wardId = latestAssignment?.wardId as { name?: string } | undefined;
    result.push({
      patientId,
      patientName: user.name,
      patientEmail: user.email,
      unbilledCount: totalUnbilled,
      unbilledSources,
      discharged: !!dischargedInfo,
      wardName: dischargedInfo?.wardName || (wardId?.name ?? 'N/A'),
      lastActivity,
    });
  }

  // ── Step 7: Sort by lastActivity descending ─────────────────────────────────
  result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  return result;
}
