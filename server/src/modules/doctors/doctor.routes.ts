import { Router } from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  getMyDoctorProfile,
  updateDoctor,
  deleteDoctor,
} from './doctor.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  createDoctorValidation,
  updateDoctorValidation,
  listDoctorsValidation,
} from './doctor.validation.js';

const router = Router();

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

router.get('/:id', getDoctorById);

router.put('/:id', authMiddleware, requireRole(ROLES.ADMIN, ROLES.DOCTOR), updateDoctorValidation, updateDoctor);

router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteDoctor);

export default router;
