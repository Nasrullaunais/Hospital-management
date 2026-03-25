import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Doctor } from './doctor.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

// ── Controllers ────────────────────────────────────────────────────────────────

/** POST /api/doctors — Create doctor record (Admin only) */
export const createDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    if (!req.file) return next(ApiError.badRequest('License document is required'));

    const doctor = await Doctor.create({
      ...req.body,
      licenseDocumentUrl: `/uploads/${req.file.filename}`,
    });

    res.status(201).json({ success: true, message: 'Doctor created', data: { doctor } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors — List all doctors (public, filterable) */
export const getDoctors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.specialization) filter.specialization = req.query.specialization;
    if (req.query.availability) filter.availability = req.query.availability;

    const doctors = await Doctor.find(filter).populate('userId', 'name email phone');
    res.json({ success: true, data: { doctors, count: doctors.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors/:id — Get single doctor (public) */
export const getDoctorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId', 'name email phone');
    if (!doctor) return next(ApiError.notFound('Doctor not found'));
    res.json({ success: true, data: { doctor } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/doctors/:id — Update doctor info (Admin/Doctor) */
export const updateDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const allowed = ['availability', 'consultationFee', 'specialization', 'experienceYears'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doctor) return next(ApiError.notFound('Doctor not found'));
    res.json({ success: true, message: 'Doctor updated', data: { doctor } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/doctors/:id — Delete doctor record (Admin only) */
export const deleteDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return next(ApiError.notFound('Doctor not found'));
    res.json({ success: true, message: 'Doctor deleted' });
  } catch (err) {
    next(err);
  }
};
