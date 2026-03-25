import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../../config/env.js';

/**
 * Auth Middleware — JWT Verification
 *
 * Reads the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 *
 * Usage: router.get('/protected', authMiddleware, handler)
 *
 * Role-based access:
 *   - Use requireRole('admin') after authMiddleware to restrict by role.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No token provided. Please log in.'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(ApiError.unauthorized('Malformed authorization header.'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Express.Request['user'];
    req.user = decoded;
    next();
  } catch {
    // Let the global error handler classify the JWT error (expired vs. invalid)
    next(new Error('JsonWebTokenError'));
  }
};

/**
 * Role Guard — Use AFTER authMiddleware
 *
 * @example
 *   router.post('/admin-only', authMiddleware, requireRole('admin'), handler)
 *   router.post('/doctors', authMiddleware, requireRole('admin', 'doctor'), handler)
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access restricted to: ${roles.join(', ')}`));
    }
    next();
  };
};
