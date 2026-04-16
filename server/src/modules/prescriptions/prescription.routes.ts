import { Router } from 'express';
import { createPrescription, getPrescriptionsByPatient, getPrescriptionById, getPendingPrescriptions, cancelPrescription } from './prescription.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, requireRole('doctor', 'admin'), createPrescription);
router.get('/patient/:patientId', authMiddleware, getPrescriptionsByPatient);
router.get('/pending', authMiddleware, requireRole('pharmacist', 'admin'), getPendingPrescriptions);
router.get('/:id', authMiddleware, getPrescriptionById);
router.put('/:id/cancel', authMiddleware, requireRole('doctor', 'admin'), cancelPrescription);

export default router;
