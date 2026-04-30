import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { env } from '../../config/env.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';

// ── Helper ─────────────────────────────────────────────────────────────────────

function signToken(userId: string, email: string, role: string): string {
  return jwt.sign({ id: userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

function handleValidationErrors(req: Request, next: NextFunction): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn({ event: 'validation_failed', errors: errors.array(), ...getRequestContext(req) }, 'Validation failed');
    next(
      new ApiError(
        422,
        'Validation failed',
      ),
    );
    return true;
  }
  return false;
}

// ── Controllers ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new user account.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (handleValidationErrors(req, next)) return;
  const { email } = req.body as { name: string; email: string; password: string };
  logger.info({ event: 'register_attempt', email, ...getRequestContext(req) }, 'Registration attempt');
  try {
    const { name, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    const existing = await User.findOne({ email });
    if (existing) {
      logger.warn(
        {
          event: 'register_duplicate_email',
          email,
          ...getRequestContext(req),
        },
        'Registration blocked: email already exists',
      );
      return next(ApiError.conflict('An account with this email already exists'));
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id.toString(), user.email, user.role);

    logger.info(
      {
        ...getRequestContext(req),
        event: 'user_registered',
        userId: user._id.toString(),
        role: user.role,
      },
      'User registered successfully',
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { token, user },
    });
  } catch (err) {
    logger.error({ event: 'register_error', err: (err as Error).message, ...getRequestContext(req) }, 'Registration error');
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticate with email + password, receive a JWT.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (handleValidationErrors(req, next)) return;
  try {
    const { email, password } = req.body as { email: string; password: string };

    // Explicitly select password (it has select: false on the schema)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      logger.warn(
        {
          event: 'login_failed',
          email,
          ...getRequestContext(req),
        },
        'Login failed due to invalid credentials',
      );
      return next(ApiError.unauthorized('Invalid credentials'));
    }

    const token = signToken(user._id.toString(), user.email, user.role);

    logger.info(
      {
        ...getRequestContext(req),
        event: 'login_success',
        userId: user._id.toString(),
        role: user.role,
      },
      'User login successful',
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patients/me
 * Get the authenticated patient's profile.
 */
export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return next(ApiError.notFound('User not found'));

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/patients/me
 * Update the authenticated patient's profile (with optional ID document upload).
 */
export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (handleValidationErrors(req, next)) return;
  try {
    const updates: Record<string, unknown> = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.dateOfBirth) updates.dateOfBirth = req.body.dateOfBirth;

    // Determine file source: S3 presigned key takes priority, fallback to multer
    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      await s3Service.verifyAndConsume(req.user!.id, req.body.fileKey);
      updates.idDocumentUrl = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      // Legacy multer upload: store with local protocol
      updates.idDocumentUrl = formatFileReference('local', `/uploads/${req.file.filename}`);
    }
    // else: stays undefined (file was optional)

    const user = await User.findByIdAndUpdate(req.user?.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!user) return next(ApiError.notFound('User not found'));

    res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/patients/me
 * Delete the authenticated patient's account.
 */
export const deleteMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.user?.id);
    if (!user) return next(ApiError.notFound('User not found'));

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};
