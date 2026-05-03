import mongoose from 'mongoose';
import { Invoice } from './invoice.model.js';
import { Dispense } from '../dispensing/dispense.model.js';
import { LabReport } from '../labReports/labReport.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { DEFAULT_CONSULTATION_FEE, DEFAULT_LAB_FEE } from '../../shared/constants/billing.js';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface UnbilledSuggestion {
  source: 'dispensing' | 'appointment' | 'lab_report';
  sourceId: string;
  description: string;
  category: 'medicine' | 'consultation' | 'lab_test';
  quantity: number;
  unitPrice: number;
  date: Date;
}

export interface SuggestionResult {
  patientId: string;
  suggestions: UnbilledSuggestion[];
  alreadyBilledCount: number;
}

// ── Service ─────────────────────────────────────────────────────────────────────

export async function getSuggestions(
  patientId: string,
  specificAppointmentId?: string,
): Promise<SuggestionResult> {
  // ── Step A: Build exclusion list from existing invoices ──────────────────
  const existingInvoices = await Invoice.find({ patientId });
  const alreadyBilledAppointmentIds = existingInvoices
    .map((inv) => inv.appointmentId)
    .filter(Boolean)
    .map((id) => id!.toString());

  // Build a set of existing invoice item descriptions for fuzzy matching
  const existingDescriptions = new Set<string>();
  for (const inv of existingInvoices) {
    for (const item of inv.items) {
      existingDescriptions.add(item.description.toLowerCase());
    }
  }

  // ── Step B: Suggestions from dispensings ─────────────────────────────────
  const unbilledDispensings = await Dispense.find({
    patientId,
    invoiceId: null,
    status: { $in: ['fulfilled', 'partial'] },
  }).populate('dispensedItems.medicineId', 'name');

  const dispensingSuggestions: UnbilledSuggestion[] = [];
  for (const dispensing of unbilledDispensings) {
    for (const item of dispensing.dispensedItems) {
      dispensingSuggestions.push({
        source: 'dispensing',
        sourceId: dispensing._id.toString(),
        description: `Medicine: ${item.medicineName}`,
        category: 'medicine',
        quantity: item.quantityDispensed,
        unitPrice: 0,
        date: dispensing.fulfilledAt,
      });
    }
  }

  // ── Step C: Suggestions from appointments ────────────────────────────────
  const appointmentFilter: Record<string, unknown> = {
    patientId,
    status: 'Completed',
    _id: { $nin: alreadyBilledAppointmentIds.map((id) => new mongoose.Types.ObjectId(id)) },
  };

  if (specificAppointmentId) {
    appointmentFilter._id = new mongoose.Types.ObjectId(specificAppointmentId);
  }

  const unbilledAppointments = await Appointment.find(appointmentFilter).populate({
    path: 'doctorId',
    populate: { path: 'userId', select: 'name' },
  });

  interface PopulatedDoctor { userId?: { name?: string } }

  const appointmentSuggestions: UnbilledSuggestion[] = unbilledAppointments.map((appt) => {
    const doctor = appt.doctorId as PopulatedDoctor | null;
    const doctorName = doctor?.userId?.name || 'Unknown';
    return {
      source: 'appointment',
      sourceId: appt._id.toString(),
      description: `Consultation — Dr. ${doctorName}`,
      category: 'consultation',
      quantity: 1,
      unitPrice: DEFAULT_CONSULTATION_FEE,
      date: appt.appointmentDate,
    };
  });

  // ── Step D: Suggestions from lab reports ─────────────────────────────────
  const labReports = await LabReport.find({
    patientId,
    status: { $in: ['completed', 'reviewed'] },
  });

  const labSuggestions: UnbilledSuggestion[] = labReports
    .filter((lab) => {
      const labDesc = `lab: ${lab.labType.replace(/_/g, ' ')}`;
      for (const existingDesc of existingDescriptions) {
        if (existingDesc.includes(labDesc) || labDesc.includes(existingDesc)) return false;
      }
      return true;
    })
    .map((lab) => ({
      source: 'lab_report',
      sourceId: lab._id.toString(),
      description: `Lab: ${lab.labType.replace(/_/g, ' ')}`,
      category: 'lab_test',
      quantity: 1,
      unitPrice: DEFAULT_LAB_FEE,
      date: lab.testDate || lab.createdAt,
    }));

  // ── Step E: Return grouped, sorted by date desc ──────────────────────────
  const allSuggestions = [...dispensingSuggestions, ...appointmentSuggestions, ...labSuggestions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    patientId,
    suggestions: allSuggestions,
    alreadyBilledCount: existingInvoices.length,
  };
}
