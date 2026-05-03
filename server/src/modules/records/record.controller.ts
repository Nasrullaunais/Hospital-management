import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { MedicalRecord } from './record.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { parsePagination, buildPaginatedResponse } from '../../shared/types/pagination.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { findDoctorProfileByUserId } from '../../shared/utils/doctorLookup.js';
import { ROLES } from '../../shared/constants/roles.js';

/** POST /api/records — Create a medical record (Doctor only) */
export const createRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());
    const doctor = await findDoctorProfileByUserId(userId as string);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));

    if (req.body.appointmentId) {
      const appointment = await Appointment.findById(req.body.appointmentId);
      if (!appointment) return next(ApiError.badRequest('Appointment not found'));
      if (appointment.patientId.toString() !== req.body.patientId) {
        return next(ApiError.badRequest('Appointment does not belong to this patient'));
      }
    }

    let labReportUrl: string | undefined;

    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      if (!req.user?.id) return next(ApiError.unauthorized());
      await s3Service.verifyAndConsume(req.user.id, req.body.fileKey);
      labReportUrl = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      labReportUrl = formatFileReference('local', `/uploads/${req.file.filename}`);
    }
    // else: stays undefined (file was optional)

    const record = await MedicalRecord.create({
      patientId: req.body.patientId,
      doctorId: doctor._id,
      appointmentId: req.body.appointmentId || undefined,
      diagnosis: req.body.diagnosis,
      prescription: req.body.prescription,
      labReportUrl,
    });

    await record.populate('patientId', 'name email');
    await record.populate({
      path: 'doctorId',
      select: 'specialization userId',
      populate: { path: 'userId', select: 'name' },
    });

    res.status(201).json({ success: true, message: 'Medical record created', data: { record } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/records/patient/:patientId — Get all records for a patient */
export const getPatientRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId) return next(ApiError.unauthorized());
    const targetId = req.params.patientId;
    if (req.user?.role === ROLES.PATIENT && requesterId !== targetId) {
      return next(ApiError.forbidden('You can only view your own medical records'));
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [records, total] = await Promise.all([
      MedicalRecord.find({ patientId: targetId })
        .populate({
          path: 'doctorId',
          select: 'specialization userId',
          populate: { path: 'userId', select: 'name' },
        })
        .sort({ dateRecorded: -1 })
        .skip(skip)
        .limit(limit),
      MedicalRecord.countDocuments({ patientId: targetId }),
    ]);

    const paginatedData = buildPaginatedResponse(records, total, page, limit);
    res.json({ success: true, data: paginatedData });
  } catch (err) {
    next(err);
  }
};

/** GET /api/records/doctor-logs — Get all records created by the authenticated doctor */
export const getDoctorRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());
    const doctor = await findDoctorProfileByUserId(userId as string);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));

    const { page, limit, skip } = parsePagination(req.query);

    const [records, total] = await Promise.all([
      MedicalRecord.find({ doctorId: doctor._id })
        .populate('patientId', 'name email')
        .sort({ dateRecorded: -1 })
        .skip(skip)
        .limit(limit),
      MedicalRecord.countDocuments({ doctorId: doctor._id }),
    ]);

    const paginatedData = buildPaginatedResponse(records, total, page, limit);
    res.json({ success: true, data: paginatedData });
  } catch (err) {
    next(err);
  }
};

/** GET /api/records/:id — Get single record */
export const getRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Fetch raw record first — permission checks must use raw ObjectIds,
    // NOT populated documents (.toString() on a populated Document returns "[object Object]")
    const record = await MedicalRecord.findById(req.params.id);

    if (!record) return next(ApiError.notFound('Medical record not found'));

    // Patients can only see their own records
    if (req.user?.role === ROLES.PATIENT && record.patientId.toString() !== req.user?.id) {
      return next(ApiError.forbidden());
    }

    // Doctors can only view records they created (unless admin)
    if (req.user?.role === ROLES.DOCTOR) {
      const userId = req.user?.id;
      if (!userId) return next(ApiError.unauthorized());
      const doctor = await findDoctorProfileByUserId(userId);
      // Compare raw ObjectIds — both are Doctor profile _ids stored/looked up the same way
      if (doctor && record.doctorId.toString() !== doctor._id.toString()) {
        return next(ApiError.forbidden('You can only view your own patient records'));
      }
    }

    // Populate for response AFTER permission check
    await record.populate('patientId', 'name email');
    await record.populate({
      path: 'doctorId',
      select: 'specialization userId',
      populate: { path: 'userId', select: 'name' },
    });

    res.json({ success: true, data: { record } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/records/:id — Update a record (Doctor only) */
export const updateRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());
    const doctor = await findDoctorProfileByUserId(userId as string);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));

    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return next(ApiError.notFound('Medical record not found'));

    // Authorization: only the doctor who created the record can update it
    if (record.doctorId.toString() !== doctor._id.toString()) {
      return next(ApiError.forbidden('You can only update your own medical records'));
    }

    const updates: Record<string, unknown> = {};
    if (req.body.diagnosis) updates.diagnosis = req.body.diagnosis;
    if (req.body.prescription !== undefined) updates.prescription = req.body.prescription;

    const updated = await MedicalRecord.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
    res.json({ success: true, message: 'Record updated', data: { record: updated } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/records/:id — Delete a record (Admin only) */
export const deleteRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const record = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!record) return next(ApiError.notFound('Medical record not found'));
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
};
