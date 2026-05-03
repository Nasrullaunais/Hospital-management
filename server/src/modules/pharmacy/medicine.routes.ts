import { Router } from 'express';
import {
  addMedicine,
  getAllMedicines,
  getMedicineById,
  adjustStock,
  updateMedicine,
  deleteMedicine,
  getMedicinesByIds,
} from './medicine.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
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
  requireRole(ROLES.ADMIN, ROLES.PHARMACIST),
  uploadSingle('packagingImage'),
  createMedicineValidation,
  addMedicine,
);

/** GET /api/medicines — Protected (staff/admin/doctor) */
router.get('/', authMiddleware, getAllMedicines);

/** GET /api/medicines/:id */
router.get('/:id', authMiddleware, getMedicineById);

/** POST /api/medicines/batch — Protected, batch fetch medicines by IDs */
router.post('/batch', authMiddleware, getMedicinesByIds);

/** PATCH /api/medicines/:id/stock — Protected */
router.patch('/:id/stock', authMiddleware, requireRole(ROLES.PHARMACIST, ROLES.ADMIN), adjustStockValidation, adjustStock);

/** PUT /api/medicines/:id — Admin only */
router.put('/:id', authMiddleware, requireRole(ROLES.ADMIN), uploadSingle('packagingImage'), updateMedicineValidation, updateMedicine);

/** DELETE /api/medicines/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteMedicine);

export default router;
