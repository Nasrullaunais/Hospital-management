import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import {
  getPatientMedications,
  getMedicationById,
} from './wardMedication.controller.js';
import {
  getPatientMedicationsValidation,
  getMedicationByIdValidation,
} from './wardMedication.validation.js';

const router = Router();

router.get(
  '/patient/:patientId',
  authMiddleware,
  requireRole('receptionist'),
  getPatientMedicationsValidation,
  getPatientMedications,
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('receptionist'),
  getMedicationByIdValidation,
  getMedicationById,
);

export default router;
