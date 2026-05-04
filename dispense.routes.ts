import { Router } from 'express';
import { dispensePrescription, getDispensesByPatient } from './dispense.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.post('/', authMiddleware, requireRole(ROLES.PHARMACIST, ROLES.ADMIN), dispensePrescription);
router.get('/patient/:patientId', authMiddleware, getDispensesByPatient);

export default router;
