import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import { Ward } from './ward.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function autoSetWardStatus(occupancy: number, totalBeds: number, currentStatus?: string): 'available' | 'full' | 'maintenance' {
  if (currentStatus === 'available' || currentStatus === 'full' || currentStatus === 'maintenance') {
    return currentStatus;
  }
  if (totalBeds <= 0 || occupancy >= totalBeds) return 'full';
  return 'available';
}

// ── Controllers ────────────────────────────────────────────────────────────────

/** POST /api/wards — Create ward (Admin only) */
export const createWard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const totalBeds = req.body.totalBeds;
    const currentOccupancy = req.body.currentOccupancy || 0;
    const status = autoSetWardStatus(currentOccupancy, totalBeds);

    const ward = await Ward.create({
      ...req.body,
      totalBeds,
      currentOccupancy,
      status,
    });

    res.status(201).json({ success: true, message: 'Ward created', data: { ward } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/wards — List all wards (Any authenticated) */
export const getWards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [wards, total] = await Promise.all([
      Ward.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Ward.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: {
        wards,
        count: wards.length,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/wards/:id — Get single ward (Any authenticated) */
export const getWardById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!wardId || !mongoose.Types.ObjectId.isValid(wardId)) {
      return next(ApiError.badRequest('Invalid ward id'));
    }

    const ward = await Ward.findById(wardId);
    if (!ward) return next(ApiError.notFound('Ward not found'));
    res.json({ success: true, data: { ward } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/wards/:id — Update ward (Admin only) */
export const updateWard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const wardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!wardId || !mongoose.Types.ObjectId.isValid(wardId)) {
      return next(ApiError.badRequest('Invalid ward id'));
    }

    const allowed = ['name', 'type', 'totalBeds', 'currentOccupancy', 'status'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Auto-set status when occupancy-related fields change, preserving explicit status
    if (req.body.totalBeds !== undefined || req.body.currentOccupancy !== undefined) {
      const existingWard = await Ward.findById(wardId);
      if (!existingWard) return next(ApiError.notFound('Ward not found'));

      const newTotalBeds = req.body.totalBeds ?? existingWard.totalBeds;
      const newOccupancy = req.body.currentOccupancy ?? existingWard.currentOccupancy;
      const newStatus = autoSetWardStatus(
        newOccupancy,
        newTotalBeds,
        req.body.status !== undefined ? req.body.status : existingWard.status,
      );
      updates.status = newStatus;
    } else if (req.body.status !== undefined) {
      updates.status = req.body.status;
    }

    const ward = await Ward.findByIdAndUpdate(wardId, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!ward) return next(ApiError.notFound('Ward not found'));
    res.json({ success: true, message: 'Ward updated', data: { ward } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/wards/:id — Delete ward (Admin only) */
export const deleteWard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!wardId || !mongoose.Types.ObjectId.isValid(wardId)) {
      return next(ApiError.badRequest('Invalid ward id'));
    }

    const ward = await Ward.findByIdAndDelete(wardId);
    if (!ward) return next(ApiError.notFound('Ward not found'));

    // Warn if ward had patients but allow deletion
    if (ward.currentOccupancy > 0) {
      res.json({
        success: true,
        message: `Ward deleted (had ${ward.currentOccupancy} patient(s) assigned)`,
      });
    } else {
      res.json({ success: true, message: 'Ward deleted' });
    }
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/wards/:id/beds — Update bed occupancy (Admin only) */
export const updateBeds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const wardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!wardId || !mongoose.Types.ObjectId.isValid(wardId)) {
      return next(ApiError.badRequest('Invalid ward id'));
    }

    const { currentOccupancy } = req.body;
    if (typeof currentOccupancy !== 'number') {
      return next(ApiError.badRequest('Current occupancy is required'));
    }

    const existingWard = await Ward.findById(wardId);
    if (!existingWard) return next(ApiError.notFound('Ward not found'));

    // Validate occupancy against actual active assignments
    const { WardAssignment } = await import('../wardAssignments/wardAssignment.model.js');
    const actualOccupancy = await WardAssignment.countDocuments({
      wardId: new mongoose.Types.ObjectId(wardId),
      status: 'active',
    });
    if (currentOccupancy < actualOccupancy) {
      return next(ApiError.badRequest(`Current occupancy cannot be less than actual active assignments (${actualOccupancy})`));
    }

    // Validate occupancy doesn't exceed total beds
    if (currentOccupancy > existingWard.totalBeds) {
      return next(ApiError.badRequest('Current occupancy cannot exceed total beds'));
    }

    // Auto-set status based on new occupancy
    const newStatus = autoSetWardStatus(currentOccupancy, existingWard.totalBeds);

    const ward = await Ward.findByIdAndUpdate(
      wardId,
      { currentOccupancy, status: newStatus },
      { returnDocument: 'after', runValidators: true },
    );
    if (!ward) return next(ApiError.notFound('Ward not found'));

    res.json({ success: true, message: 'Bed occupancy updated', data: { ward } });
  } catch (err) {
    next(err);
  }
};
