import { Router } from 'express';
import {
  createInvoice,
  getMyBills,
  getAllInvoices,
  getInvoiceById,
  uploadPaymentReceipt,
  verifyPayment,
  deleteInvoice,
} from './invoice.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { createInvoiceValidation, verifyPaymentValidation } from './invoice.validation.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

/** POST /api/invoices — Staff/Admin creates invoice */
router.post('/', authMiddleware, requireRole(ROLES.ADMIN), createInvoiceValidation, createInvoice);

/** GET /api/invoices/my-bills — Patient's own bills */
router.get('/my-bills', authMiddleware, requireRole(ROLES.PATIENT), getMyBills);

/** GET /api/invoices — All invoices (Admin) */
router.get('/', authMiddleware, requireRole(ROLES.ADMIN), getAllInvoices);

/** GET /api/invoices/:id — Get single invoice (Patient own or Admin) */
router.get('/:id', authMiddleware, requireRole(ROLES.PATIENT, ROLES.ADMIN), getInvoiceById);

/** PUT /api/invoices/:id/pay — Patient uploads payment receipt */
router.put('/:id/pay', authMiddleware, requireRole(ROLES.PATIENT), uploadSingle('paymentReceipt'), uploadPaymentReceipt);

/** PUT /api/invoices/:id/verify — Admin verifies payment */
router.put('/:id/verify', authMiddleware, requireRole(ROLES.ADMIN), verifyPaymentValidation, verifyPayment);

/** DELETE /api/invoices/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteInvoice);

export default router;
