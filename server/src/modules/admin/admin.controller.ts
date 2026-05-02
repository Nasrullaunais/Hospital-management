import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { User } from '../auth/auth.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/admin/users — Create a receptionist or pharmacist user */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed'));
  }
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(ApiError.conflict('Email already exists'));
    }

    // Create the user (password hashing handled by model pre-save hook)
    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: 'User created',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/users — List staff users (receptionists, pharmacists) with optional role filter and pagination */
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed'));
  }
  try {
    const role = req.query.role as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Build filter: if role param provided, filter by it; otherwise default to staff roles
    const filter: Record<string, unknown> = {};
    if (role) {
      filter.role = role;
    } else {
      filter.role = { $in: ['receptionist', 'pharmacist'] };
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users,
        count: users.length,
        pagination: {
          total,
          page,
          limit,
          pages,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/users/:id — Soft-delete a staff user (set isActive: false) */
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed'));
  }
  try {
    const { id } = req.params;

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      return next(ApiError.forbidden('Cannot delete admin users'));
    }

    // Prevent self-deletion
    if (req.user?.id === id) {
      return next(ApiError.forbidden('Cannot delete your own account'));
    }

    // Soft delete: mark as inactive
    await User.findByIdAndUpdate(id, { isActive: false });

    res.json({
      success: true,
      message: 'User deleted',
    });
  } catch (err) {
    next(err);
  }
};
