import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { MedicalRecord } from './record.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/records — Create a medical record (Doctor only) */
export const createRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const record = await MedicalRecord.create({
      patientId: req.body.patientId,
      doctorId: req.user!.id,
      diagnosis: req.body.diagnosis,
      prescription: req.body.prescription,
      labReportUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    res.status(201).json({ success: true, message: 'Medical record created', data: { record } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/records/patient/:patientId — Get all records for a patient */
export const getPatientRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Patients can only view their own records
    const requesterId = req.user!.id;
    const targetId = req.params.patientId;
    if (req.user!.role === 'patient' && requesterId !== targetId) {
      return next(ApiError.forbidden('You can only view your own medical records'));
    }

    const records = await MedicalRecord.find({ patientId: targetId })
      .populate('doctorId', 'specialization')
      .sort({ dateRecorded: -1 });

    res.json({ success: true, data: { records, count: records.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/records/:id — Get single record */
export const getRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'specialization');

    if (!record) return next(ApiError.notFound('Medical record not found'));

    // Patients can only see their own records
    if (req.user!.role === 'patient' && record.patientId.toString() !== req.user!.id) {
      return next(ApiError.forbidden());
    }

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
    const updates: Record<string, unknown> = {};
    if (req.body.diagnosis) updates.diagnosis = req.body.diagnosis;
    if (req.body.prescription !== undefined) updates.prescription = req.body.prescription;

    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!record) return next(ApiError.notFound('Medical record not found'));
    res.json({ success: true, message: 'Record updated', data: { record } });
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
