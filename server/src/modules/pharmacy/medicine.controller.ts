import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Medicine } from './medicine.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/medicines */
export const addMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    if (!req.file) return next(ApiError.badRequest('Packaging image is required'));

    const name = String(req.body['name'] ?? '').trim();
    const category = String(req.body['category'] ?? '').trim();
    const price = Number(req.body['price']);
    const stockQuantity = Number(req.body['stockQuantity']);
    const expiryDate = new Date(String(req.body['expiryDate'] ?? ''));

    if (!Number.isFinite(price) || price < 0) {
      return next(ApiError.badRequest('Price must be a non-negative number'));
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return next(ApiError.badRequest('Stock quantity must be a non-negative integer'));
    }

    if (Number.isNaN(expiryDate.getTime())) {
      return next(ApiError.badRequest('Expiry date must be a valid date'));
    }

    const medicine = await Medicine.create({
      name,
      category,
      price,
      stockQuantity,
      expiryDate,
      packagingImageUrl: `/uploads/${req.file.filename}`,
    });

    res.status(201).json({ success: true, message: 'Medicine added', data: { medicine } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/medicines */
export const getAllMedicines = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;

    const medicines = await Medicine.find(filter).sort({ name: 1 }).collation({ locale: 'en' });
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
    const updates: Record<string, unknown> = {};

    if (req.body['name'] !== undefined) {
      updates['name'] = String(req.body['name']).trim();
    }

    if (req.body['category'] !== undefined) {
      updates['category'] = String(req.body['category']).trim();
    }

    if (req.body['price'] !== undefined) {
      const parsedPrice = Number(req.body['price']);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return next(ApiError.badRequest('Price must be a non-negative number'));
      }
      updates['price'] = parsedPrice;
    }

    if (req.body['stockQuantity'] !== undefined) {
      const parsedStock = Number(req.body['stockQuantity']);
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        return next(ApiError.badRequest('Stock quantity must be a non-negative integer'));
      }
      updates['stockQuantity'] = parsedStock;
    }

    if (req.body['expiryDate'] !== undefined) {
      const parsedExpiryDate = new Date(String(req.body['expiryDate']));
      if (Number.isNaN(parsedExpiryDate.getTime())) {
        return next(ApiError.badRequest('Expiry date must be a valid date'));
      }
      updates['expiryDate'] = parsedExpiryDate;
    }

    if (Object.keys(updates).length === 0) {
      return next(ApiError.badRequest('No valid fields provided for update'));
    }

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!medicine) return next(ApiError.notFound('Medicine not found'));
    res.json({ success: true, message: 'Medicine updated', data: { medicine } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/medicines/:id/stock */
export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));

  try {
    const quantityChange = Number(req.body['quantityChange']);
    if (!Number.isInteger(quantityChange) || quantityChange === 0) {
      return next(ApiError.badRequest('quantityChange must be a non-zero integer'));
    }

    const updateFilter: Record<string, unknown> = { _id: req.params.id };
    if (quantityChange < 0) {
      updateFilter['stockQuantity'] = { $gte: Math.abs(quantityChange) };
    }

    const medicine = await Medicine.findOneAndUpdate(
      updateFilter,
      { $inc: { stockQuantity: quantityChange } },
      { new: true, runValidators: true },
    );

    if (!medicine) {
      const exists = await Medicine.exists({ _id: req.params.id });
      if (!exists) {
        return next(ApiError.notFound('Medicine not found'));
      }
      return next(ApiError.badRequest('Insufficient stock for this adjustment'));
    }

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: { medicine, quantityChange },
    });
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
