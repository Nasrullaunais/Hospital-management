import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import {
  getPatientMedications,
  getMedicationById,
  addWardMedication,
  updateWardMedication,
  discontinueMedication,
} from './wardMedication.controller.js';
import {
  getPatientMedicationsValidation,
  getMedicationByIdValidation,
  addWardMedicationValidation,
  updateWardMedicationValidation,
  discontinueMedicationValidation,
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

router.post(
  '/',
  authMiddleware,
  requireRole('receptionist'),
  addWardMedicationValidation,
  addWardMedication,
);

router.patch(
  '/:id',
  authMiddleware,
  requireRole('receptionist'),
  updateWardMedicationValidation,
  updateWardMedication,
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('receptionist'),
  discontinueMedicationValidation,
  discontinueMedication,
);

export default router;
