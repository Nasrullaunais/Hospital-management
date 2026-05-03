import { Router } from 'express';
import {
  assignPatient,
  getWardAssignments,
  getAssignmentById,
  updateAssignment,
  dischargePatient,
  getWardStats,
  getBedStatuses,
  getWardPatients,
  getPatientById,
  getAllPatients,
} from './wardAssignment.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  assignPatientValidation,
  assignmentIdValidation,
  updateAssignmentValidation,
  wardIdParamValidation,
  wardIdQueryValidation,
  patientIdParamValidation,
} from './wardAssignment.validation.js';

const router = Router();

/** POST /api/assignments — Receptionist only */
router.post(
  '/',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  assignPatientValidation,
  assignPatient,
);

/** GET /api/assignments/ward/:wardId — Receptionist only */
router.get(
  '/ward/:wardId',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  wardIdParamValidation,
  getWardAssignments,
);

/** GET /api/assignments/stats — Receptionist only (MUST be before /:id) */
router.get(
  '/stats',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  wardIdQueryValidation,
  getWardStats,
);

/** GET /api/assignments/bed-statuses — Receptionist only (MUST be before /:id) */
router.get(
  '/bed-statuses',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  wardIdQueryValidation,
  getBedStatuses,
);

/** GET /api/assignments/:id — Receptionist only */
router.get(
  '/:id',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  assignmentIdValidation,
  getAssignmentById,
);

/** PATCH /api/assignments/:id — Receptionist only */
router.patch(
  '/:id',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  updateAssignmentValidation,
  updateAssignment,
);

/** DELETE /api/assignments/:id — Receptionist only (discharge) */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  assignmentIdValidation,
  dischargePatient,
);

/** GET /api/assignments/ward/:wardId/patients — Receptionist only */
router.get(
  '/ward/:wardId/patients',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  wardIdParamValidation,
  getWardPatients,
);

/** GET /api/assignments/patient/:patientId — Receptionist only */
router.get(
  '/patient/:patientId',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  patientIdParamValidation,
  getPatientById,
);

/** GET /api/assignments/patients — Receptionist only */
router.get(
  '/patients',
  authMiddleware,
  requireRole(ROLES.RECEPTIONIST),
  wardIdQueryValidation,
  getAllPatients,
);

export default router;
