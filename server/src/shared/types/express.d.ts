/**
 * Express Request Type Augmentation
 *
 * Extends Express's Request interface to add the `user` property,
 * which is attached by authMiddleware after JWT verification.
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        role: 'patient' | 'doctor' | 'admin' | 'pharmacist' | 'receptionist';
      };
    }
  }
}

export {};
