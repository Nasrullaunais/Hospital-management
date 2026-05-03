import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { User } from './auth.model.js';
import { TokenBlacklist } from './tokenBlacklist.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { env } from '../../config/env.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function signToken(userId: string, email: string, role: string): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_EXPIRES_IN));
  const token = jwt.sign({ id: userId, email, role, jti }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  return { token, jti, expiresAt };
}

/** Parse a vercel/ms-style duration string to milliseconds. Supports "7d", "24h", "30m", etc. */
function parseDuration(input: string): number {
  const match = input.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] ?? 1);
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
    const { token } = signToken(user._id.toString(), user.email, user.role);

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
    const user = await User.findOne({ email, isActive: true }).select('+password');
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

    const { token } = signToken(user._id.toString(), user.email, user.role);

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

export const searchPatients = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = (req.query.q as string) || '';
    if (query.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const patients = await User.find({
      role: 'patient',
      $or: [{ name: regex }, { email: regex }],
    })
      .select('name email phone')
      .limit(10)
      .lean();

    res.json({ success: true, data: patients });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Stores the token's JTI in the blacklist so it cannot be reused.
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id ?? 'unknown';

    // Extract the raw token from the Authorization header
    const authHeader = req.headers['authorization'] ?? '';
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (rawToken) {
      try {
        // Decode without verifying (token was already verified by authMiddleware)
        const decoded = jwt.decode(rawToken) as { jti?: string; exp?: number } | null;
        if (decoded?.jti && decoded?.exp) {
          await TokenBlacklist.create({
            jti: decoded.jti,
            expiresAt: new Date(decoded.exp * 1000),
            revokedAt: new Date(),
            userId,
          });
        }
      } catch {
        // If we can't decode the token, proceed with logout anyway
        logger.warn({ event: 'logout_decode_failed', userId }, 'Could not decode token for blacklisting');
      }
    }

    logger.info({ event: 'user_logout', ...getRequestContext(req) }, 'User logged out');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
