import { Router } from 'express';
import { createRecord, getPatientRecords, getDoctorRecords, getRecordById, updateRecord, deleteRecord } from './record.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import { createRecordValidation, updateRecordValidation } from './record.validation.js';

const router = Router();

router.post('/', authMiddleware, requireRole(ROLES.DOCTOR), uploadSingle('labReport'), createRecordValidation, createRecord);

router.get('/patient/:patientId', authMiddleware, getPatientRecords);

router.get('/doctor-logs', authMiddleware, requireRole(ROLES.DOCTOR), getDoctorRecords);

router.get('/:id', authMiddleware, getRecordById);

router.put('/:id', authMiddleware, requireRole(ROLES.DOCTOR), updateRecordValidation, updateRecord);

router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteRecord);

export default router;
