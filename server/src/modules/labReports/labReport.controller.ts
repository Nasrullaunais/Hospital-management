import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { LabReport } from './labReport.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { findDoctorProfileByUserId } from '../../shared/utils/doctorLookup.js';
import { ROLES } from '../../shared/constants/roles.js';

/** POST /api/lab-reports — Create a lab report (Doctor only) */
export const createLabReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user!.id as string;
    const doctor = await findDoctorProfileByUserId(userId);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));

    if (req.body.medicalRecordId) {
      const { MedicalRecord } = await import('../records/record.model.js');
      const record = await MedicalRecord.findById(req.body.medicalRecordId);
      if (!record) return next(ApiError.badRequest('Medical record not found'));
      if (record.patientId.toString() !== req.body.patientId) {
        return next(ApiError.badRequest('Medical record does not belong to this patient'));
      }
    }

    if (req.body.appointmentId) {
      const { Appointment } = await import('../appointments/appointment.model.js');
      const appointment = await Appointment.findById(req.body.appointmentId);
      if (!appointment) return next(ApiError.badRequest('Appointment not found'));
      if (appointment.patientId.toString() !== req.body.patientId) {
        return next(ApiError.badRequest('Appointment does not belong to this patient'));
      }
    }

    const labReport = await LabReport.create({
      patientId: req.body.patientId,
      doctorId: doctor._id,
      medicalRecordId: req.body.medicalRecordId || undefined,
      appointmentId: req.body.appointmentId || undefined,
      labType: req.body.labType,
      testDate: req.body.testDate || undefined,
      results: req.body.results,
      interpretation: req.body.interpretation,
      notes: req.body.notes,
    });

    await labReport.populate('patientId', 'name email');
    await labReport.populate({
      path: 'doctorId',
      select: 'specialization userId',
      populate: { path: 'userId', select: 'name' },
    });

    res.status(201).json({ success: true, message: 'Lab report created', data: { labReport } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/lab-reports/patient/:patientId — Get all lab reports for a patient */
export const getPatientLabReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requesterId = req.user!.id;
    const targetId = req.params.patientId;
    if (req.user!.role === ROLES.PATIENT && requesterId !== targetId) {
      return next(ApiError.forbidden('You can only view your own lab reports'));
    }

    const labReports = await LabReport.find({ patientId: targetId })
      .populate({
        path: 'doctorId',
        select: 'specialization userId',
        populate: { path: 'userId', select: 'name' },
      })
      .sort({ testDate: -1 });

    res.json({ success: true, data: { labReports, count: labReports.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/lab-reports/:id — Get single lab report */
export const getLabReportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const labReport = await LabReport.findById(req.params.id);

    if (!labReport) return next(ApiError.notFound('Lab report not found'));

    // Patients can only see their own lab reports
    if (req.user!.role === ROLES.PATIENT && labReport.patientId.toString() !== req.user!.id) {
      return next(ApiError.forbidden());
    }

    // Doctors can only view lab reports they created (unless admin)
    if (req.user!.role === ROLES.DOCTOR) {
      const userId = req.user!.id as string;
      const doctor = await findDoctorProfileByUserId(userId);
      if (doctor && labReport.doctorId.toString() !== doctor._id.toString()) {
        return next(ApiError.forbidden('You can only view your own patient lab reports'));
      }
    }

    await labReport.populate('patientId', 'name email');
    await labReport.populate({
      path: 'doctorId',
      select: 'specialization userId',
      populate: { path: 'userId', select: 'name' },
    });

    res.json({ success: true, data: { labReport } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/lab-reports/:id — Update a lab report (Doctor only) */
export const updateLabReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user!.id as string;
    const doctor = await findDoctorProfileByUserId(userId);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));

    const labReport = await LabReport.findById(req.params.id);
    if (!labReport) return next(ApiError.notFound('Lab report not found'));

    // Authorization: only the doctor who created the report can update it
    if (labReport.doctorId.toString() !== doctor._id.toString()) {
      return next(ApiError.forbidden('You can only update your own lab reports'));
    }

    const updates: Record<string, unknown> = {};
    if (req.body.labType) updates.labType = req.body.labType;
    if (req.body.results) updates.results = req.body.results;
    if (req.body.interpretation !== undefined) updates.interpretation = req.body.interpretation;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.status) updates.status = req.body.status;

    const updated = await LabReport.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    res.json({ success: true, message: 'Lab report updated', data: { labReport: updated } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/lab-reports/:id/review — Review a lab report (Doctor only) */
export const reviewLabReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id as string;
    const doctor = await findDoctorProfileByUserId(userId);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));

    const labReport = await LabReport.findById(req.params.id);
    if (!labReport) return next(ApiError.notFound('Lab report not found'));

    if (labReport.doctorId.toString() !== doctor._id.toString()) {
      return next(ApiError.forbidden('You can only review your own lab reports'));
    }

    labReport.status = 'reviewed';
    await labReport.save();

    res.json({ success: true, message: 'Lab report reviewed', data: { labReport } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/lab-reports/:id — Delete a lab report (Admin only) */
export const deleteLabReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const labReport = await LabReport.findByIdAndDelete(req.params.id);
    if (!labReport) return next(ApiError.notFound('Lab report not found'));
    res.json({ success: true, message: 'Lab report deleted' });
  } catch (err) {
    next(err);
  }
};
