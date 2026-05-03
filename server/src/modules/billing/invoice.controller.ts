import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../../shared/utils/ApiError.js';
import { resolveFileUpload } from '../../shared/utils/fileResolver.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';
import { isMongoDuplicateKeyError } from '../../shared/utils/mongoHelpers.js';
import * as invoiceService from './invoice.service.js';
import { getSuggestions } from './invoice.suggestion.service.js';
import { getPendingBillingPatients } from './invoice.pendingBilling.service.js';

// ── Validation Helper ──────────────────────────────────────────────────────────

function validate(req: Request): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msgs = errors.array().map(e => e.msg).join(', ');
    throw ApiError.badRequest(`Validation failed: ${msgs}`);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function getUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw ApiError.unauthorized();
  return id;
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] ?? '' : val ?? '';
}

// ── Controllers ────────────────────────────────────────────────────────────────

/** POST /api/invoices — Create invoice (Staff/Admin) */
export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const invoice = await invoiceService.createInvoice({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      items: req.body.items,
      discount: req.body.discount,
      notes: req.body.notes,
    });
    logger.info(
      { event: 'invoice_created', invoiceId: invoice._id.toString(), ...getRequestContext(req) },
      'Invoice created',
    );
    res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) return next(new ApiError(409, 'Invoice with this number already exists'));
    next(err);
  }
};

/** GET /api/invoices/:id — Get a single invoice by ID */
export const getInvoiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const userRole = req.user?.role ?? '';
    const invoice = await invoiceService.getInvoiceById(getParam(req, 'id'), userId, userRole);
    res.json({ success: true, data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/my-bills — Patient's own invoices */
export const getMyBills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const result = await invoiceService.getMyInvoices(userId, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices — All invoices (Staff/Admin) */
export const getAllInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await invoiceService.getAllInvoices(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/invoices/:id/pay — Patient uploads payment receipt */
export const uploadPaymentReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const paymentReceiptUrl = await resolveFileUpload(req, userId, 'fileKey');
    if (!paymentReceiptUrl) {
      return next(ApiError.badRequest('Payment receipt file is required'));
    }
    const invoice = await invoiceService.uploadPaymentReceipt(getParam(req, 'id'), userId, paymentReceiptUrl);
    logger.info(
      { event: 'invoice_receipt_uploaded', invoiceId: invoice._id.toString(), ...getRequestContext(req) },
      'Invoice payment receipt uploaded',
    );
    res.json({ success: true, message: 'Receipt uploaded. Awaiting verification.', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/invoices/:id/verify — Staff verifies payment, marks as Paid */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    validate(req);
    const invoice = await invoiceService.verifyPayment(getParam(req, 'id'), req.body.paymentStatus);
    logger.info(
      { event: 'invoice_payment_verified', invoiceId: invoice._id.toString(), ...getRequestContext(req) },
      'Invoice payment verified',
    );
    res.json({ success: true, message: 'Payment verified', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/stats — Invoice statistics (Admin) */
export const getInvoiceStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await invoiceService.getInvoiceStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/suggestions/:patientId — Auto-detect unbilled charges */
export const getInvoiceSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const appointmentId = req.query.appointmentId as string | undefined;
    const result = await getSuggestions(getParam(req, 'patientId'), appointmentId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/pending-patients — Patients needing billing */
export const getInvoicePendingBilling = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await getPendingBillingPatients();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/invoices/:id — Admin only */
export const deleteInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role ?? '';
    await invoiceService.deleteInvoice(getParam(req, 'id'), userRole);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};
