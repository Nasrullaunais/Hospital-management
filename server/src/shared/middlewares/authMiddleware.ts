import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../../config/env.js';
import { logger } from '../utils/logger.js';
import { getRequestContext } from '../utils/logger.js';
import mongoose from 'mongoose';

// Lazy-loaded to avoid circular dependency (loaded once, cached by Bun)
let _TokenBlacklistModel: typeof import('../../modules/auth/tokenBlacklist.model.js').TokenBlacklist | null = null;

/**
 * Auth Middleware — JWT Verification with Token Blacklist checking
 *
 * Reads the Bearer token from the Authorization header, verifies it,
 * checks if it has been revoked (blacklisted), and attaches the decoded
 * payload to req.user.
 *
 * Usage: router.get('/protected', authMiddleware, handler)
 *
 * Role-based access:
 *   - Use requireRole('admin') after authMiddleware to restrict by role.
 */
export const authMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
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
    const decoded = jwt.verify(token, env.JWT_SECRET) as Express.Request['user'] & { jti?: string };

    // Check token blacklist (fail-closed: reject if check unavailable)
    if (decoded?.jti && mongoose.connection.readyState === 1) {
      try {
        _TokenBlacklistModel ??= (await import('../../modules/auth/tokenBlacklist.model.js')).TokenBlacklist;
        const isBlacklisted = await _TokenBlacklistModel.exists({ jti: decoded.jti });
        if (isBlacklisted) {
          logger.warn(
            { event: 'auth_blacklisted_token', jti: decoded.jti, ...getRequestContext(req) },
            'Authentication failed: token has been revoked',
          );
          return next(ApiError.unauthorized('Token has been revoked. Please log in again.'));
        }
      } catch (err) {
        logger.error(
          { event: 'auth_blacklist_check_failed', jti: decoded.jti, err, ...getRequestContext(req) },
          'Authentication failed: unable to verify token blacklist',
        );
        return next(ApiError.internal('Authentication service unavailable. Please try again.'));
      }
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
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
