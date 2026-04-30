import { Router } from 'express';
import { generateLabReport, generatePrescriptionPDF, generateMedicalCertificate } from './report.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.post('/lab-report', authMiddleware, requireRole(ROLES.DOCTOR), generateLabReport);
router.post('/prescription', authMiddleware, requireRole(ROLES.DOCTOR), generatePrescriptionPDF);
router.post('/medical-certificate', authMiddleware, requireRole(ROLES.DOCTOR), generateMedicalCertificate);

export default router;
