import { Router } from 'express';
import { register, login, getMyProfile, updateMyProfile, deleteMyProfile } from './auth.controller.js';
import { authMiddleware } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { registerValidation, loginValidation, updateProfileValidation } from './auth.validation.js';

const router = Router();

// ── Public Routes ──────────────────────────────────────────────────────────────

/** POST /api/auth/register — Create new user account */
router.post('/auth/register', registerValidation, register);

/** POST /api/auth/login — Login and receive JWT */
router.post('/auth/login', loginValidation, login);

// ── Protected Patient Routes ───────────────────────────────────────────────────

/** GET /api/patients/me — Get own profile */
router.get('/patients/me', authMiddleware, getMyProfile);

/** PUT /api/patients/me — Update profile + optional ID document upload */
router.put(
  '/patients/me',
  authMiddleware,
  uploadSingle('idDocument'),
  updateProfileValidation,
  updateMyProfile,
);

/** DELETE /api/patients/me — Delete own account */
router.delete('/patients/me', authMiddleware, deleteMyProfile);

export default router;
