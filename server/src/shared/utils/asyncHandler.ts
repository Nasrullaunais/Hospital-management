import type { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler to catch rejected promises and forward them to next().
 * Eliminates repetitive try/catch in every controller handler.
 *
 * @example
 *   export const getPrescriptionById = asyncHandler(async (req, res, next) => {
 *     const prescription = await Prescription.findById(req.params.id);
 *     if (!prescription) return next(ApiError.notFound('Prescription not found'));
 *     res.json({ success: true, data: prescription });
 *   });
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}