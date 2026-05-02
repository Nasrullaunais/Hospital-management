import { Router } from 'express';
import {
  createPayment,
  getPaymentsByInvoice,
  processPayment,
  getPaymentById,
} from './payment.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { createPaymentValidation } from './payment.validation.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

/** POST /api/payments — Patient creates payment */
router.post('/', authMiddleware, requireRole(ROLES.PATIENT), createPaymentValidation, createPayment);

/** GET /api/payments/invoice/:invoiceId — Payments for an invoice */
router.get('/invoice/:invoiceId', authMiddleware, requireRole(ROLES.PATIENT, ROLES.ADMIN), getPaymentsByInvoice);

/** POST /api/payments/:id/process — Process a payment */
router.post('/:id/process', authMiddleware, requireRole(ROLES.PATIENT, ROLES.ADMIN), processPayment);

/** GET /api/payments/:id — Get single payment */
router.get('/:id', authMiddleware, requireRole(ROLES.PATIENT, ROLES.ADMIN), getPaymentById);

export default router;
