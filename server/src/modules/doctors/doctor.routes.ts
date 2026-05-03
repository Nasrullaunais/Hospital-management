import { Router } from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  getMyDoctorProfile,
  updateDoctor,
  deleteDoctor,
} from './doctor.controller.js';
import { getSpecializations } from './doctor.controller.js';
import {
  upsertSchedule,
  getSchedule,
  getAvailableSlots,
} from './doctorSchedule.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  createDoctorValidation,
  updateDoctorValidation,
  listDoctorsValidation,
} from './doctor.validation.js';
import { upsertScheduleValidation } from './doctorSchedule.validation.js';

const router = Router();

// ── Specializations ─────────────────────────────────────────────────────────────
// Must be BEFORE /:id to avoid matching "specializations" as an id param
router.get('/specializations', getSpecializations);

// ── Schedule ────────────────────────────────────────────────────────────────────
router.post(
  '/schedule',
  authMiddleware,
  requireRole(ROLES.ADMIN, ROLES.DOCTOR),
  upsertScheduleValidation,
  upsertSchedule,
);

// ── Doctor CRUD ────────────────────────────────────────────────────────────────
router.post(
  '/',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  uploadSingle('licenseDocument'),
  createDoctorValidation,
  createDoctor,
);

router.get('/', listDoctorsValidation, getDoctors);

router.get('/me', authMiddleware, requireRole(ROLES.DOCTOR), getMyDoctorProfile);

// Must be AFTER /specializations, /schedule, /me, / to avoid collision
router.get('/:id/schedule', getSchedule);
router.get('/:id/available-slots', getAvailableSlots);
router.get('/:id', getDoctorById);

router.put('/:id', authMiddleware, requireRole(ROLES.ADMIN, ROLES.DOCTOR), updateDoctorValidation, updateDoctor);

router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteDoctor);

export default router;
