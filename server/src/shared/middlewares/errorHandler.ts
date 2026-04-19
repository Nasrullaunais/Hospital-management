import type { Request, Response, NextFunction } from 'express';
import type { Error as MongooseError } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { getRequestContext, logger } from '../utils/logger.js';

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

/**
 * Global Error Handler Middleware
 *
 * Must be the LAST middleware registered in index.ts (after all routes).
 * Catches all errors passed via next(err) and returns a standardized JSON response.
 *
 * Response shape:
 *   { success: false, message: string, errors?: unknown, stack?: string }
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const isDev = process.env.NODE_ENV === 'development';
  const requestContext = getRequestContext(req);

  // ── 1. Already an ApiError (operational) ────────────────────────────────────
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ event: 'api_error', statusCode: err.statusCode, ...requestContext, err }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // ── 2. Mongoose Validation Error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const mongooseErr = err as MongooseError.ValidationError;
    const errors = Object.values(mongooseErr.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // ── 3. Mongoose CastError (invalid ObjectId) ──────────────────────────────────
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid value provided for one of the fields.',
    });
    return;
  }

  // ── 4. MongoDB Duplicate Key (E11000) ─────────────────────────────────────────
  const mongoErr = err as MongoServerError;
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
    });
    return;
  }

  // ── 5. JWT Errors ─────────────────────────────────────────────────────────────
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    return;
  }
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
    return;
  }

  // ── 6. Multer errors ──────────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
    return;
  }

  // ── 7. Unknown / unexpected error ────────────────────────────────────────────
  logger.error(
    {
      event: 'unhandled_error',
      ...requestContext,
      err,
    },
    'Unhandled error',
  );
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Something went wrong. Please try again.',
    ...(isDev && { stack: err.stack }),
  });
};
