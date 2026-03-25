import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Medicine } from './medicine.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/medicines */
export const createMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    if (!req.file) return next(ApiError.badRequest('Packaging image is required'));

    const medicine = await Medicine.create({
      ...req.body,
      packagingImageUrl: `/uploads/${req.file.filename}`,
    });

    res.status(201).json({ success: true, message: 'Medicine added', data: { medicine } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/medicines */
export const getMedicines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.json({ success: true, data: { medicines, count: medicines.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/medicines/:id */
export const getMedicineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return next(ApiError.notFound('Medicine not found'));
    res.json({ success: true, data: { medicine } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/medicines/:id */
export const updateMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const allowed = ['stockQuantity', 'price', 'expiryDate'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!medicine) return next(ApiError.notFound('Medicine not found'));
    res.json({ success: true, message: 'Medicine updated', data: { medicine } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/medicines/:id */
export const deleteMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return next(ApiError.notFound('Medicine not found'));
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (err) {
    next(err);
  }
};
