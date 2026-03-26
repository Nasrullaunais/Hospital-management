import { Router } from 'express';
import {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  adjustStock,
  updateMedicine,
  deleteMedicine,
} from './medicine.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import {
  createMedicineValidation,
  updateMedicineValidation,
  adjustStockValidation,
} from './medicine.validation.js';

const router = Router();

/** POST /api/medicines — Admin or Pharmacist */
router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'pharmacist'),
  uploadSingle('packagingImage'),
  createMedicineValidation,
  addMedicine,
);

/** GET /api/medicines — Protected (staff/admin/doctor) */
router.get('/', authMiddleware, getAllMedicines);

/** GET /api/medicines/:id */
router.get('/:id', authMiddleware, getMedicineById);

/** PATCH /api/medicines/:id/stock — Protected */
router.patch('/:id/stock', authMiddleware, adjustStockValidation, adjustStock);

/** PUT /api/medicines/:id — Admin only */
router.put('/:id', authMiddleware, requireRole('admin'), updateMedicineValidation, updateMedicine);

/** DELETE /api/medicines/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteMedicine);

export default router;
