import { Router } from 'express';
import { dispensePrescription, getDispensesByPatient } from './dispense.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, requireRole('pharmacist', 'admin'), dispensePrescription);
router.get('/patient/:patientId', authMiddleware, getDispensesByPatient);

export default router;
