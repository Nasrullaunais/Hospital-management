import { Router } from 'express';
import {
  createWard,
  getWards,
  getWardById,
  updateWard,
  deleteWard,
  updateBeds,
} from './ward.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import {
  createWardValidation,
  updateWardValidation,
  updateBedsValidation,
  wardIdValidation,
  listWardsValidation,
} from './ward.validation.js';

const router = Router();

/** POST /api/wards — Admin only */
router.post(
  '/',
  authMiddleware,
  requireRole(ROLES.ADMIN),
  createWardValidation,
  createWard,
);

/** GET /api/wards — Authenticated, supports ?type=, ?status= filters */
router.get('/', authMiddleware, listWardsValidation, getWards);

/** GET /api/wards/:id — Authenticated */
router.get('/:id', authMiddleware, wardIdValidation, getWardById);

/** PUT /api/wards/:id — Admin only */
router.put('/:id', authMiddleware, requireRole(ROLES.ADMIN), updateWardValidation, updateWard);

/** DELETE /api/wards/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), wardIdValidation, deleteWard);

/** PATCH /api/wards/:id/beds — Admin only, update bed occupancy */
router.patch('/:id/beds', authMiddleware, requireRole(ROLES.ADMIN), updateBedsValidation, updateBeds);

export default router;
