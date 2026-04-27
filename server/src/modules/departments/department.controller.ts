import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { Department } from './department.model.js';
import { Ward } from '../wards/ward.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { isMongoDuplicateKeyError } from '../../shared/utils/mongoHelpers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────────

function isDuplicateKeyError(err: unknown): boolean {
  return isMongoDuplicateKeyError(err);
}

// ── Controllers ────────────────────────────────────────────────────────────────

/** POST /api/departments — Create department (Admin only) */
export const createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, message: 'Department created', data: { department } });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return next(new ApiError(409, 'A department with this name already exists'));
    }
    next(err);
  }
};

/** GET /api/departments — List all departments (Any authenticated) */
export const getDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate('headDoctorId', 'userId')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Department.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: {
        departments,
        count: departments.length,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/departments/:id — Get single department (Any authenticated) */
export const getDepartmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return next(new ApiError.badRequest('Invalid department id'));
    }

    const department = await Department.findById(departmentId).populate('headDoctorId', 'userId');
    if (!department) return next(new ApiError.notFound('Department not found'));
    res.json({ success: true, data: { department } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/departments/:id — Update department (Admin only) */
export const updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const departmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return next(new ApiError.badRequest('Invalid department id'));
    }

    const allowed = ['name', 'description', 'headDoctorId', 'location', 'phone', 'status'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const existingDepartment = await Department.findById(departmentId);
    if (!existingDepartment) return next(new ApiError.notFound('Department not found'));

    const department = await Department.findByIdAndUpdate(departmentId, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!department) return next(new ApiError.notFound('Department not found'));
    res.json({ success: true, message: 'Department updated', data: { department } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/departments/:id — Delete department (Admin only) */
export const deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const departmentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!departmentId || !mongoose.Types.ObjectId.isValid(departmentId)) {
      return next(new ApiError.badRequest('Invalid department id'));
    }

    // Check if department has any wards
    const wardsCount = await Ward.countDocuments({ departmentId });
    if (wardsCount > 0) {
      return next(
        new ApiError(
          400,
          `Cannot delete department: it has ${wardsCount} associated ward(s). Delete or reassign wards first.`,
        ),
      );
    }

    const department = await Department.findByIdAndDelete(departmentId);
    if (!department) return next(new ApiError.notFound('Department not found'));
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) {
    next(err);
  }
};
