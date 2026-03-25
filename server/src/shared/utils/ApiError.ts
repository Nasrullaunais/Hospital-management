/**
 * Custom API Error
 *
 * Extends the native Error class to add HTTP statusCode and an isOperational flag.
 * Use this throughout controllers and middlewares to throw predictable, catchable errors.
 *
 * @example
 *   throw new ApiError(404, 'User not found');
 *   throw new ApiError(400, 'Invalid input');
 *   throw new ApiError(403, 'Forbidden');
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  /** isOperational = true means this is an expected, user-facing error (not a bug) */
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }
}
