import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import { validationResult } from 'express-validator';
import { Doctor } from './doctor.model.js';
import { User } from '../auth/auth.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { ROLES } from '../../shared/constants/roles.js';
import { findDoctorProfileByUserId } from '../../shared/utils/doctorLookup.js';
import { isMongoDuplicateKeyError } from '../../shared/utils/mongoHelpers.js';

// ── Controllers ────────────────────────────────────────────────────────────────

async function cleanupUploadedFile(file?: Express.Multer.File): Promise<void> {
  if (!file?.path) return;
  try {
    await fs.unlink(file.path);
  } catch (err) {
    console.error('Failed to cleanup uploaded file:', file.path, err instanceof Error ? err.message : err);
  }
}

/** POST /api/doctors — Create doctor record (Admin only) */
export const createDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    await cleanupUploadedFile(req.file);
    return next(new ApiError(422, 'Validation failed'));
  }
  try {
    let licenseDocumentUrl: string;

    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      // S3 presigned upload flow: verify the fileKey belongs to this user
      await s3Service.verifyAndConsume(req.user!.id, req.body.fileKey);
      licenseDocumentUrl = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      // Legacy multer upload: store with local protocol
      licenseDocumentUrl = formatFileReference('local', `/uploads/${req.file.filename}`);
    } else {
      return next(ApiError.badRequest('License document is required'));
    }

    // Check if email already taken
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      if (req.file) { await cleanupUploadedFile(req.file); }
      return next(ApiError.conflict('A user with this email already exists'));
    }

    // Create the user account with doctor role
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: ROLES.DOCTOR,
    });

    try {
      const doctor = await Doctor.create({
        userId: user._id,
        specialization: req.body.specialization,
        experienceYears: req.body.experienceYears,
        consultationFee: req.body.consultationFee,
        licenseDocumentUrl,
      });

      res.status(201).json({
        success: true,
        message: 'Doctor created',
        data: { doctor: { ...doctor.toObject(), userId: user } },
      });
    } catch (doctorErr) {
      // Best-effort rollback: delete the user we just created
      try { await User.findByIdAndDelete(user._id); } catch { /* ignore rollback failure */ }
      throw doctorErr;
    }
  } catch (err) {
    await cleanupUploadedFile(req.file);
    if (isMongoDuplicateKeyError(err)) {
      return next(new ApiError(409, 'A doctor profile already exists for this user'));
    }
    next(err);
  }
};

/** GET /api/doctors — List all doctors (public, filterable, paginated) */
export const getDoctors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.specialization) filter.specialization = { $regex: req.query.specialization as string, $options: 'i' };
    if (req.query.availability) filter.availability = req.query.availability;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [doctors, total] = await Promise.all([
      Doctor.find(filter).populate('userId', 'name email phone').skip(skip).limit(limit),
      Doctor.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: {
        doctors,
        count: doctors.length,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors/me — Get authenticated doctor's own profile */
export const getMyDoctorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id as string;
    const doctor = await findDoctorProfileByUserId(userId);
    if (!doctor) return next(ApiError.notFound('Doctor profile not found for this account'));
    res.json({ success: true, data: { doctor } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors/:id — Get single doctor (public) */
export const getDoctorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return next(ApiError.badRequest('Invalid doctor id'));
    }

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name email phone');
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
    const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return next(ApiError.badRequest('Invalid doctor id'));
    }

    const allowed = ['availability', 'consultationFee', 'specialization', 'experienceYears'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const existingDoctor = await Doctor.findById(doctorId);
    if (!existingDoctor) return next(ApiError.notFound('Doctor not found'));

    if (req.user?.role === ROLES.DOCTOR && existingDoctor.userId.toString() !== req.user.id) {
      return next(ApiError.forbidden('Doctors can only update their own profile'));
    }

    const doctor = await Doctor.findByIdAndUpdate(doctorId, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!doctor) return next(ApiError.notFound('Doctor not found'));
    res.json({ success: true, message: 'Doctor updated', data: { doctor } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/doctors/:id — Delete doctor record (Admin only) */
export const deleteDoctor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const doctorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return next(ApiError.badRequest('Invalid doctor id'));
    }

    const doctor = await Doctor.findByIdAndDelete(doctorId);
    if (!doctor) return next(ApiError.notFound('Doctor not found'));
    res.json({ success: true, message: 'Doctor deleted' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/doctors/specializations — List all distinct specializations */
export const getSpecializations = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const specializations = await Doctor.distinct('specialization');
    res.json({ success: true, data: { specializations } });
  } catch (err) {
    next(err);
  }
};
