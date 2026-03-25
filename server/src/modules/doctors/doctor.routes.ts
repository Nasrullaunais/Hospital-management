import { Router } from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from './doctor.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import {
  createDoctorValidation,
  updateDoctorValidation,
  listDoctorsValidation,
} from './doctor.validation.js';

const router = Router();

/** POST /api/doctors — Admin only, requires license doc upload */
router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  uploadSingle('licenseDocument'),
  createDoctorValidation,
  createDoctor,
);

/** GET /api/doctors — Public, supports ?specialization= and ?availability= filters */
router.get('/', listDoctorsValidation, getDoctors);

/** GET /api/doctors/:id — Public */
router.get('/:id', getDoctorById);

/** PUT /api/doctors/:id — Admin or Doctor */
router.put('/:id', authMiddleware, requireRole('admin', 'doctor'), updateDoctorValidation, updateDoctor);

/** DELETE /api/doctors/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteDoctor);

export default router;
