import { Router } from 'express';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
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
  requireRole(ROLES.RECEPTIONIST),
  getPatientMedicationsValidation,
  getPatientMedications,
);

router.get(
  '/:id',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  getMedicationByIdValidation,
  getMedicationById,
);

router.post(
  '/',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  addWardMedicationValidation,
  addWardMedication,
);

router.patch(
  '/:id',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  updateWardMedicationValidation,
  updateWardMedication,
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  discontinueMedicationValidation,
  discontinueMedication,
);

export default router;
