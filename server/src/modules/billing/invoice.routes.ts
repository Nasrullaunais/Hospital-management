import { Router } from 'express';
import {
  createInvoice,
  getMyBills,
  getAllInvoices,
  getInvoiceById,
  getInvoiceStats,
  getSuggestions,
  getPendingBillingPatients,
  uploadPaymentReceipt,
  verifyPayment,
  deleteInvoice,
} from './invoice.controller.js';
import { authMiddleware, requireRole } from '../../shared/middlewares/authMiddleware.js';
import { uploadSingle } from '../../shared/middlewares/uploadMiddleware.js';
import { createInvoiceValidation, verifyPaymentValidation } from './invoice.validation.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

/** POST /api/invoices — Admin/Receptionist creates invoice */
router.post('/', authMiddleware, requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST), createInvoiceValidation, createInvoice);

/** GET /api/invoices/my-bills — Patient's own bills */
router.get('/my-bills', authMiddleware, requireRole(ROLES.PATIENT), getMyBills);

/** GET /api/invoices — All invoices (Admin/Receptionist) */
router.get('/', authMiddleware, requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST), getAllInvoices);

/** GET /api/invoices/stats — Invoice statistics (Admin/Receptionist) */
router.get('/stats', authMiddleware, requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST), getInvoiceStats);

/** GET /api/invoices/suggestions/:patientId — Auto-detect unbilled charges (Staff/Admin) */
router.get('/suggestions/:patientId', authMiddleware, requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST), getSuggestions);

/** GET /api/invoices/pending-patients — Patients needing billing (Receptionist/Admin) */
router.get('/pending-patients', authMiddleware, requireRole(ROLES.RECEPTIONIST, ROLES.ADMIN), getPendingBillingPatients);

/** GET /api/invoices/:id — Get single invoice (Patient own, Admin, Receptionist) */
router.get('/:id', authMiddleware, requireRole(ROLES.PATIENT, ROLES.ADMIN, ROLES.RECEPTIONIST), getInvoiceById);

/** PUT /api/invoices/:id/pay — Patient uploads payment receipt */
router.put('/:id/pay', authMiddleware, requireRole(ROLES.PATIENT), uploadSingle('paymentReceipt'), uploadPaymentReceipt);

/** PUT /api/invoices/:id/verify — Admin/Receptionist verifies payment */
router.put('/:id/verify', authMiddleware, requireRole(ROLES.ADMIN, ROLES.RECEPTIONIST), verifyPaymentValidation, verifyPayment);

/** DELETE /api/invoices/:id — Admin only (receptionists cannot delete) */
router.delete('/:id', authMiddleware, requireRole(ROLES.ADMIN), deleteInvoice);

export default router;
