import { Router } from 'express';
import { createMedicine, getMedicines, getMedicineById, updateMedicine, deleteMedicine } from './medicine.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { createMedicineValidation, updateMedicineValidation } from './medicine.validation.js';

const router = Router();

/** POST /api/medicines — Admin only */
router.post('/', authMiddleware, requireRole('admin'), uploadSingle('packagingImage'), createMedicineValidation, createMedicine);

/** GET /api/medicines — Protected (staff/admin/doctor) */
router.get('/', authMiddleware, getMedicines);

/** GET /api/medicines/:id */
router.get('/:id', authMiddleware, getMedicineById);

/** PUT /api/medicines/:id — Admin only */
router.put('/:id', authMiddleware, requireRole('admin'), updateMedicineValidation, updateMedicine);

/** DELETE /api/medicines/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteMedicine);

export default router;
