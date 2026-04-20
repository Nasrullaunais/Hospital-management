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
} from './wardAssignment.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import {
  assignPatientValidation,
  assignmentIdValidation,
  updateAssignmentValidation,
  wardIdParamValidation,
  wardIdQueryValidation,
} from './wardAssignment.validation.js';

const router = Router();

/** POST /api/assignments — Receptionist only */
router.post(
  '/',
  authMiddleware,
  requireRole('receptionist'),
  assignPatientValidation,
  assignPatient,
);

/** GET /api/assignments/ward/:wardId — Receptionist only */
router.get(
  '/ward/:wardId',
  authMiddleware,
  requireRole('receptionist'),
  wardIdParamValidation,
  getWardAssignments,
);

/** GET /api/assignments/:id — Receptionist only */
router.get(
  '/:id',
  authMiddleware,
  requireRole('receptionist'),
  assignmentIdValidation,
  getAssignmentById,
);

/** PATCH /api/assignments/:id — Receptionist only */
router.patch(
  '/:id',
  authMiddleware,
  requireRole('receptionist'),
  updateAssignmentValidation,
  updateAssignment,
);

/** DELETE /api/assignments/:id — Receptionist only (discharge) */
router.delete(
  '/:id',
  authMiddleware,
  requireRole('receptionist'),
  assignmentIdValidation,
  dischargePatient,
);

/** GET /api/assignments/stats — Receptionist only */
router.get(
  '/stats',
  authMiddleware,
  requireRole('receptionist'),
  wardIdQueryValidation,
  getWardStats,
);

/** GET /api/assignments/bed-statuses — Receptionist only */
router.get(
  '/bed-statuses',
  authMiddleware,
  requireRole('receptionist'),
  wardIdQueryValidation,
  getBedStatuses,
);

/** GET /api/assignments/ward/:wardId/patients — Receptionist only */
router.get(
  '/ward/:wardId/patients',
  authMiddleware,
  requireRole('receptionist'),
  wardIdParamValidation,
  getWardPatients,
);

export default router;
