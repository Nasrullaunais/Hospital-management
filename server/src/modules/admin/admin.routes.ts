import { Router } from 'express';
import { createUser, listUsers, getUserById, updateUser, deleteUser } from './admin.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import {
  createUserValidation,
  listUsersValidation,
  getUserByIdValidation,
  updateUserValidation,
  deleteUserValidation,
} from './admin.validation.js';

const router = Router();

/** POST /api/admin/users — Create a staff user (admin only) */
router.post('/', authMiddleware, requireRole('admin'), createUserValidation, createUser);

/** GET /api/admin/users — List staff users (admin only) */
router.get('/', authMiddleware, requireRole('admin'), listUsersValidation, listUsers);

/** GET /api/admin/users/:id — Get a single staff user (admin only) */
router.get('/:id', authMiddleware, requireRole('admin'), getUserByIdValidation, getUserById);

/** PUT /api/admin/users/:id — Update a staff user (admin only) */
router.put('/:id', authMiddleware, requireRole('admin'), updateUserValidation, updateUser);

/** DELETE /api/admin/users/:id — Soft-delete a staff user (admin only) */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteUserValidation, deleteUser);

export default router;
