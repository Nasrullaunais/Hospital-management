import { Router } from 'express';
import { createUser, listUsers, deleteUser } from './admin.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import {
  createUserValidation,
  listUsersValidation,
  deleteUserValidation,
} from './admin.validation.js';

const router = Router();

/** POST /api/admin/users — Create a staff user (admin only) */
router.post('/', authMiddleware, requireRole('admin'), createUserValidation, createUser);

/** GET /api/admin/users — List staff users (admin only) */
router.get('/', authMiddleware, requireRole('admin'), listUsersValidation, listUsers);

/** DELETE /api/admin/users/:id — Soft-delete a staff user (admin only) */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteUserValidation, deleteUser);

export default router;
