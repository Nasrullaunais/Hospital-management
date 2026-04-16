import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../../config/env.js';
import { logger } from '../utils/logger.js';
import { getRequestContext } from '../utils/logger.js';

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
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(
      {
        event: 'auth_missing_token',
        ...getRequestContext(req),
      },
      'Authentication failed: missing bearer token',
    );
    return next(ApiError.unauthorized('No token provided. Please log in.'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    logger.warn(
      {
        event: 'auth_malformed_header',
        ...getRequestContext(req),
      },
      'Authentication failed: malformed authorization header',
    );
    return next(ApiError.unauthorized('Malformed authorization header.'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as Express.Request['user'];
    req.user = decoded;
    next();
  } catch {
    logger.warn(
      {
        event: 'auth_invalid_token',
        ...getRequestContext(req),
      },
      'Authentication failed: invalid or expired token',
    );
    next(ApiError.unauthorized('Invalid or expired token. Please log in again.'));
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
      logger.warn(
        {
          event: 'auth_user_missing_after_auth',
          ...getRequestContext(req),
        },
        'Authorization failed: authenticated user missing on request',
      );
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(
        {
          event: 'authorization_denied',
          allowedRoles: roles,
          ...getRequestContext(req),
        },
        'Authorization denied due to role mismatch',
      );
      return next(ApiError.forbidden(`Access restricted to: ${roles.join(', ')}`));
    }
    next();
  };
};
