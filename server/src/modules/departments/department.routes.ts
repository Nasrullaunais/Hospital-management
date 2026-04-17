import { Router } from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from './department.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import {
  createDepartmentValidation,
  updateDepartmentValidation,
  departmentIdValidation,
  listDepartmentsValidation,
} from './department.validation.js';

const router = Router();

/** POST /api/departments — Admin only */
router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  createDepartmentValidation,
  createDepartment,
);

/** GET /api/departments — Authenticated, supports ?status= filter */
router.get('/', authMiddleware, listDepartmentsValidation, getDepartments);

/** GET /api/departments/:id — Authenticated */
router.get('/:id', authMiddleware, departmentIdValidation, getDepartmentById);

/** PUT /api/departments/:id — Admin only */
router.put('/:id', authMiddleware, requireRole('admin'), updateDepartmentValidation, updateDepartment);

/** DELETE /api/departments/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole('admin'), departmentIdValidation, deleteDepartment);

export default router;
