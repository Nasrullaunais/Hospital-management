import { Router } from 'express';
import { createPrescription, getPrescriptionsByPatient, getPrescriptionById, getPendingPrescriptions, getPrescriptionsByMedicalRecord, cancelPrescription } from './prescription.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.post('/', authMiddleware, requireRole(ROLES.DOCTOR, ROLES.ADMIN), createPrescription);
router.get('/patient/:patientId', authMiddleware, getPrescriptionsByPatient);
router.get('/record/:medicalRecordId', authMiddleware, getPrescriptionsByMedicalRecord);
router.get('/pending', authMiddleware, requireRole(ROLES.PHARMACIST, ROLES.ADMIN), getPendingPrescriptions);
router.get('/:id', authMiddleware, getPrescriptionById);
router.put('/:id/cancel', authMiddleware, requireRole(ROLES.DOCTOR, ROLES.ADMIN), cancelPrescription);

export default router;
