import type { Request, Response, NextFunction } from 'express';
import { MedicalRecord } from '../records/record.model.js';
import { reportGenerator } from '../../shared/services/reportGenerator.js';
import { ApiError } from '../../shared/utils/ApiError.js';

// ── Populated Shape Helpers ────────────────────────────────────────────────────
// These describe the shape of Mongoose documents after .populate() so that
// template-data extraction does not require as any or @ts-ignore.

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  dateOfBirth?: Date;
  phone?: string;
}

interface PopulatedDoctor {
  _id: string;
  specialization: string;
  userId: PopulatedUser;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function calcAge(dob: Date | undefined): number {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── POST /api/reports/lab-report ────────────────────────────────────────────────

export const generateLabReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { labReportId } = req.body;
    if (!labReportId) return next(ApiError.badRequest('labReportId is required'));

    const { LabReport } = await import('../labReports/labReport.model.js');

    const labReport = await LabReport.findById(labReportId)
      .populate('patientId', 'name email dateOfBirth phone')
      .populate({
        path: 'doctorId',
        select: 'specialization userId',
        populate: { path: 'userId', select: 'name' },
      });

    if (!labReport) return next(ApiError.notFound('Lab report not found'));

    if (!['completed', 'reviewed'].includes(labReport.status)) {
      return next(ApiError.badRequest('Lab report must be completed before generating PDF'));
    }

    const patient = labReport.patientId as unknown as PopulatedUser;
    const doctor = labReport.doctorId as unknown as PopulatedDoctor;

    const templateData: Record<string, unknown> = {
      hospitalName: 'LIFELINE CARE HOSPITAL',
      hospitalAddress: '123 Healthcare Blvd, Medical District',
      hospitalPhone: '+1 (555) 123-4567',
      reportId: labReport._id.toString().slice(-8).toUpperCase(),
      patientName: patient.name,
      patientAge: calcAge(patient.dateOfBirth),
      patientGender: 'N/A',
      patientId: patient._id.toString().slice(-8),
      doctorName: doctor.userId.name,
      doctorSpecialization: doctor.specialization,
      labType: (labReport.labType as string).toUpperCase(),
      testDate: formatDate(labReport.testDate),
      reportDate: formatDate(new Date()),
      results: (labReport.results ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        flagClass: r.flag === 'normal' ? 'normal' : r.flag === 'critical' ? 'critical' : 'abnormal',
      })),
      interpretation: labReport.interpretation || 'No interpretation provided.',
      notes: labReport.notes || '',
      qrCodeDataUrl: '',
    };

    const result = await reportGenerator.generateReport({
      type: 'lab-report',
      data: templateData,
      patientId: patient._id.toString(),
      reportId: labReport._id.toString(),
    });

    res.json({ success: true, data: { downloadUrl: result.downloadUrl, fileKey: result.fileKey } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/reports/prescription ──────────────────────────────────────────────

export const generatePrescriptionPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { prescriptionId } = req.body;
    if (!prescriptionId) return next(ApiError.badRequest('prescriptionId is required'));

    const { Prescription } = await import('../prescriptions/prescription.model.js');

    const prescription = await Prescription.findById(prescriptionId)
      .populate('patientId', 'name email dateOfBirth phone')
      .populate({
        path: 'doctorId',
        select: 'specialization userId',
        populate: { path: 'userId', select: 'name' },
      });

    if (!prescription) return next(ApiError.notFound('Prescription not found'));

    const patient = prescription.patientId as unknown as PopulatedUser;
    const doctor = prescription.doctorId as unknown as PopulatedDoctor;

    const templateData: Record<string, unknown> = {
      hospitalName: 'LIFELINE CARE HOSPITAL',
      hospitalAddress: '123 Healthcare Blvd, Medical District',
      hospitalPhone: '+1 (555) 123-4567',
      reportId: prescription._id.toString().slice(-8).toUpperCase(),
      patientName: patient.name,
      patientAge: calcAge(patient.dateOfBirth),
      patientGender: 'N/A',
      patientId: patient._id.toString().slice(-8),
      doctorName: doctor.userId.name,
      doctorSpecialization: doctor.specialization,
      date: formatDate(new Date()),
      items: prescription.items,
      notes: prescription.notes || '',
    };

    const result = await reportGenerator.generateReport({
      type: 'prescription',
      data: templateData,
      patientId: patient._id.toString(),
      reportId: prescription._id.toString(),
    });

    res.json({ success: true, data: { downloadUrl: result.downloadUrl, fileKey: result.fileKey } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/reports/medical-certificate ───────────────────────────────────────

export const generateMedicalCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { recordId, restFrom, restTo } = req.body;
    if (!recordId) return next(ApiError.badRequest('recordId is required'));

    const record = await MedicalRecord.findById(recordId);
    if (!record) return next(ApiError.notFound('Medical record not found'));

    await record.populate('patientId', 'name email dateOfBirth phone');
    await record.populate({
      path: 'doctorId',
      select: 'specialization userId',
      populate: { path: 'userId', select: 'name' },
    });

    const patient = record.patientId as unknown as PopulatedUser;
    const doctor = record.doctorId as unknown as PopulatedDoctor;

    const templateData: Record<string, unknown> = {
      hospitalName: 'LIFELINE CARE HOSPITAL',
      hospitalAddress: '123 Healthcare Blvd, Medical District',
      hospitalPhone: '+1 (555) 123-4567',
      certificateId: record._id.toString().slice(-8).toUpperCase(),
      patientName: patient.name,
      patientAge: calcAge(patient.dateOfBirth),
      patientGender: 'N/A',
      patientId: patient._id.toString().slice(-8),
      doctorName: doctor.userId.name,
      doctorSpecialization: doctor.specialization,
      diagnosis: record.diagnosis,
      restFrom: restFrom || '',
      restTo: restTo || '',
      date: formatDate(new Date()),
    };

    const result = await reportGenerator.generateReport({
      type: 'medical-certificate',
      data: templateData,
      patientId: patient._id.toString(),
      reportId: record._id.toString(),
    });

    res.json({ success: true, data: { downloadUrl: result.downloadUrl, fileKey: result.fileKey } });
  } catch (err) {
    next(err);
  }
};
