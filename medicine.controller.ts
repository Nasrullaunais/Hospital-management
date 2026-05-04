import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'node:crypto';
import path from 'node:path';
import mongoose from 'mongoose';
import { Medicine } from './medicine.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { S3_PREFIX } from '../../config/s3.js';
import { parsePagination, buildPaginatedResponse } from '../../shared/types/pagination.js';

/** POST /api/medicines */
export const addMedicine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed'));
  }

  try {
    let packagingImageUrl: string;

    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      // S3 presigned upload flow: verify the fileKey belongs to this user
      await s3Service.verifyAndConsume(req.user!.id, req.body.fileKey);
      packagingImageUrl = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      // Memory-storage multer upload: upload directly to S3
      const ext = path.extname(req.file.originalname);
      const key = `${S3_PREFIX}pharmacy/${crypto.randomUUID()}${ext}`;
      await s3Service.uploadBuffer(key, req.file.buffer, req.file.mimetype);
      packagingImageUrl = formatFileReference('s3', key);
    } else {
      return next(ApiError.badRequest('Either fileKey (S3) or file upload is required'));
    }

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
      packagingImageUrl,
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

    const { page, limit, skip } = parsePagination(req.query);

    const [medicines, total] = await Promise.all([
      Medicine.find(filter).sort({ name: 1 }).collation({ locale: 'en' }).skip(skip).limit(limit),
      Medicine.countDocuments(filter),
    ]);

    const paginatedData = buildPaginatedResponse(medicines, total, page, limit);
    res.json({ success: true, data: paginatedData });
  } catch (err) {
    next(err);
  }
};

/** GET /api/medicines/:id */
export const getMedicineById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(ApiError.badRequest('Invalid medicine ID'));
    }
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
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed'));
  }

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

    // Handle image update: S3 presigned upload or local file upload
    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      // S3 presigned upload flow: verify the fileKey belongs to this user
      await s3Service.verifyAndConsume(req.user!.id, req.body.fileKey);
      updates['packagingImageUrl'] = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      // Memory-storage multer upload: upload directly to S3
      const ext = path.extname(req.file.originalname);
      const key = `${S3_PREFIX}pharmacy/${crypto.randomUUID()}${ext}`;
      await s3Service.uploadBuffer(key, req.file.buffer, req.file.mimetype);
      updates['packagingImageUrl'] = formatFileReference('s3', key);
    }

    if (Object.keys(updates).length === 0) {
      return next(ApiError.badRequest('No valid fields provided for update'));
    }

    const medicine = await Medicine.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
    if (!medicine) return next(ApiError.notFound('Medicine not found'));
    res.json({ success: true, message: 'Medicine updated', data: { medicine } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/medicines/:id/stock */
export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => e.msg).join(', ');
    return next(new ApiError(422, `Validation failed: ${errorMessages}`));
  }

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
      { returnDocument: 'after', runValidators: true },
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

/** POST /api/medicines/batch - Get multiple medicines by IDs (for N+1 elimination) */
export const getMedicinesByIds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return next(ApiError.badRequest('ids must be a non-empty array'));
    }

    if (ids.length > 100) {
      return next(ApiError.badRequest('Maximum 100 IDs per batch request'));
    }

    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(ApiError.badRequest(`Invalid medicine IDs: ${invalidIds.join(', ')}`));
    }

    const medicines = await Medicine.find({ _id: { $in: ids } });
    res.json({ success: true, data: { medicines } });
  } catch (err) {
    next(err);
  }
};
