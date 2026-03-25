import { Router } from 'express';
import {
  createInvoice,
  getMyBills,
  getAllInvoices,
  uploadPaymentReceipt,
  verifyPayment,
  deleteInvoice,
} from './invoice.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { createInvoiceValidation, verifyPaymentValidation } from './invoice.validation.js';

const router = Router();

/** POST /api/invoices — Staff/Admin creates invoice */
router.post('/', authMiddleware, requireRole('admin'), createInvoiceValidation, createInvoice);

/** GET /api/invoices/my-bills — Patient's own bills */
router.get('/my-bills', authMiddleware, requireRole('patient'), getMyBills);

/** GET /api/invoices — All invoices (Admin) */
router.get('/', authMiddleware, requireRole('admin'), getAllInvoices);

/** PUT /api/invoices/:id/pay — Patient uploads payment receipt */
router.put('/:id/pay', authMiddleware, requireRole('patient'), uploadSingle('paymentReceipt'), uploadPaymentReceipt);

/** PUT /api/invoices/:id/verify — Admin verifies payment */
router.put('/:id/verify', authMiddleware, requireRole('admin'), verifyPaymentValidation, verifyPayment);

/** DELETE /api/invoices/:id — Admin only */
router.delete('/:id', authMiddleware, requireRole('admin'), deleteInvoice);

export default router;
