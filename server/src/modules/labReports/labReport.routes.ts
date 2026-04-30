import { Router } from 'express';
import {
  createLabReport,
  getPatientLabReports,
  getLabReportById,
  updateLabReport,
  reviewLabReport,
  deleteLabReport,
} from './labReport.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import { createLabReportValidation, updateLabReportValidation } from './labReport.validation.js';

const router = Router();

router.post('/', authMiddleware, requireRole(ROLES.DOCTOR), createLabReportValidation, createLabReport);

router.get('/patient/:patientId', authMiddleware, getPatientLabReports);

router.get('/:id', authMiddleware, getLabReportById);

router.put('/:id', authMiddleware, requireRole(ROLES.DOCTOR), updateLabReportValidation, updateLabReport);

router.patch('/:id/review', authMiddleware, requireRole(ROLES.DOCTOR), reviewLabReport);

router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteLabReport);

export default router;
