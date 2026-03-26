import { Router } from 'express';
import { createRecord, getPatientRecords, getDoctorRecords, getRecordById, updateRecord, deleteRecord } from './record.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { createRecordValidation, updateRecordValidation } from './record.validation.js';

const router = Router();

/** POST /api/records — Doctor creates a medical record */
router.post('/', authMiddleware, requireRole('doctor'), uploadSingle('labReport'), createRecordValidation, createRecord);

/** GET /api/records/patient/:patientId — Get all records for a patient */
router.get('/patient/:patientId', authMiddleware, getPatientRecords);

/** GET /api/records/doctor-logs — Get all records created by the authenticated doctor */
router.get('/doctor-logs', authMiddleware, requireRole('doctor'), getDoctorRecords);

/** GET /api/records/:id — Get single record */
router.get('/:id', authMiddleware, getRecordById);

/** PUT /api/records/:id — Doctor updates a record */
router.put('/:id', authMiddleware, requireRole('doctor'), updateRecordValidation, updateRecord);

/** DELETE /api/records/:id — Admin deletes a record */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteRecord);

export default router;
