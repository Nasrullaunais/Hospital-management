import type { Request, Response, NextFunction } from 'express';
import { MedicalRecord } from '../records/record.model.js';
import { LabReport } from '../labReports/labReport.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { reportGenerator } from '../../shared/services/reportGenerator.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { logger, getRequestContext } from '../../shared/utils/logger.js';

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
  const start = Date.now();
  try {
    logger.info({ event: 'pdf_generation_started', ...getRequestContext(req), reportType: 'lab-report' }, 'PDF generation started');

    const { labReportId } = req.body;
    if (!labReportId) return next(ApiError.badRequest('labReportId is required'));

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
      results: (labReport.results ?? []).map((r) => {
        const obj = (r as any).toObject?.() ?? r;
        return {
          ...obj,
          flagClass: obj.flag === 'normal' ? 'normal' : obj.flag === 'high' ? 'high' : obj.flag === 'low' ? 'low' : obj.flag === 'critical' ? 'critical' : 'normal',
        };
      }),
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

    logger.info({ event: 'pdf_generation_completed', ...getRequestContext(req), reportType: 'lab-report', durationMs: Math.round(Date.now() - start), fileKey: result.fileKey }, 'PDF generated');

    res.json({ success: true, data: { downloadUrl: result.downloadUrl, fileKey: result.fileKey } });
  } catch (err) {
    logger.error({ event: 'pdf_generation_failed', ...getRequestContext(req), reportType: 'lab-report', err }, 'PDF generation failed');
    next(err);
  }
};

// ── POST /api/reports/prescription ──────────────────────────────────────────────

export const generatePrescriptionPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const start = Date.now();
  try {
    logger.info({ event: 'pdf_generation_started', ...getRequestContext(req), reportType: 'prescription' }, 'PDF generation started');

    const { prescriptionId } = req.body;
    if (!prescriptionId) return next(ApiError.badRequest('prescriptionId is required'));

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
      prescriptionId: prescription._id.toString().slice(-8).toUpperCase(),
      patientName: patient.name,
      patientAge: calcAge(patient.dateOfBirth),
      patientGender: 'N/A',
      patientId: patient._id.toString().slice(-8),
      doctorName: doctor.userId.name,
      doctorSpecialization: doctor.specialization,
      medicines: (prescription.items ?? []).map((item: any) => ({
        medicineName: item.medicineName,
        dosage: item.dosage,
        frequency: 'As directed',
        duration: 'As needed',
        instructions: item.instructions || '',
      })),
      notes: prescription.notes || '',
      reportDate: formatDate(new Date()),
      qrCodeDataUrl: '',
    };

    const result = await reportGenerator.generateReport({
      type: 'prescription',
      data: templateData,
      patientId: patient._id.toString(),
      reportId: prescription._id.toString(),
    });

    logger.info({ event: 'pdf_generation_completed', ...getRequestContext(req), reportType: 'prescription', durationMs: Math.round(Date.now() - start), fileKey: result.fileKey }, 'PDF generated');

    res.json({ success: true, data: { downloadUrl: result.downloadUrl, fileKey: result.fileKey } });
  } catch (err) {
    logger.error({ event: 'pdf_generation_failed', ...getRequestContext(req), reportType: 'prescription', err }, 'PDF generation failed');
    next(err);
  }
};

// ── POST /api/reports/medical-certificate ───────────────────────────────────────

export const generateMedicalCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const start = Date.now();
  try {
    logger.info({ event: 'pdf_generation_started', ...getRequestContext(req), reportType: 'medical-certificate' }, 'PDF generation started');

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
      dateOfExamination: formatDate(record.dateRecorded || record.createdAt || new Date()),
      reportDate: formatDate(new Date()),
      restDays: (restFrom && restTo) ? Math.ceil((new Date(restTo).getTime() - new Date(restFrom).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      fitnessNote: 'The patient is advised rest and follow-up as needed.',
    };

    const result = await reportGenerator.generateReport({
      type: 'medical-certificate',
      data: templateData,
      patientId: patient._id.toString(),
      reportId: record._id.toString(),
    });

    logger.info({ event: 'pdf_generation_completed', ...getRequestContext(req), reportType: 'medical-certificate', durationMs: Math.round(Date.now() - start), fileKey: result.fileKey }, 'PDF generated');

    res.json({ success: true, data: { downloadUrl: result.downloadUrl, fileKey: result.fileKey } });
  } catch (err) {
    logger.error({ event: 'pdf_generation_failed', ...getRequestContext(req), reportType: 'medical-certificate', err }, 'PDF generation failed');
    next(err);
  }
};