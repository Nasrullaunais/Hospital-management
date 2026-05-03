import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Payment } from './payment.model.js';
import { Invoice } from './invoice.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';
import { ROLES } from '../../shared/constants/roles.js';

/**
 * POST /api/payments — Create a payment for an invoice
 * Patient creates a payment record. If method is 'mock_card', auto-completes.
 */
export const createPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const { invoiceId, method } = req.body;

    // Verify invoice exists and belongs to patient
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return next(ApiError.notFound('Invoice not found'));
    if (invoice.patientId.toString() !== userId) {
      return next(ApiError.forbidden('You can only pay for your own invoices'));
    }
    if (invoice.paymentStatus === 'Paid') {
      return next(ApiError.badRequest('Invoice is already paid'));
    }

    // Compute amount from invoice (virtual totalAmount)
    const amount = invoice.totalAmount;

    const payment = await Payment.create({
      invoiceId,
      patientId: userId,
      amount,
      method,
      status: method === 'mock_card' ? 'completed' : 'pending',
      completedAt: method === 'mock_card' ? new Date() : undefined,
    });

    // Auto-process mock_card payments — mark invoice as paid
    if (method === 'mock_card') {
      await Invoice.findByIdAndUpdate(invoiceId, { paymentStatus: 'Paid' });
    }

    logger.info(
      {
        event: 'payment_created',
        paymentId: payment._id.toString(),
        invoiceId,
        patientId: userId,
        amount,
        method,
        ...getRequestContext(req),
      },
      'Payment created',
    );

    res.status(201).json({ success: true, message: 'Payment created', data: { payment } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments/invoice/:invoiceId — Get all payments for an invoice
 * Auth: patient who owns the invoice, or admin
 */
export const getPaymentsByInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) return next(ApiError.notFound('Invoice not found'));

    const userRole = req.user?.role;
    if (userRole !== ROLES.ADMIN && invoice.patientId.toString() !== userId) {
      return next(ApiError.forbidden('You can only view payments for your own invoices'));
    }

    const payments = await Payment.find({ invoiceId: req.params.invoiceId }).sort({ createdAt: -1 });

    res.json({ success: true, data: { payments, count: payments.length } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/:id/process — Process a pending payment
 * For mock_card payments, marks as completed. Future: Stripe integration.
 */
export const processPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const payment = await Payment.findById(req.params.id);
    if (!payment) return next(ApiError.notFound('Payment not found'));

    const userRole = req.user?.role;
    if (userRole !== ROLES.ADMIN && payment.patientId.toString() !== userId) {
      return next(ApiError.forbidden('You can only process your own payments'));
    }

    if (payment.status !== 'pending') {
      return next(ApiError.badRequest(`Payment is already ${payment.status}`));
    }

    if (payment.method === 'mock_card') {
      payment.status = 'completed';
      payment.completedAt = new Date();
      await payment.save();
      await Invoice.findByIdAndUpdate(payment.invoiceId, { paymentStatus: 'Paid' });
    } else {
      return next(ApiError.badRequest(`Cannot auto-process ${payment.method} payments`));
    }

    logger.info(
      {
        event: 'payment_processed',
        paymentId: payment._id.toString(),
        invoiceId: payment.invoiceId.toString(),
        patientId: payment.patientId.toString(),
        ...getRequestContext(req),
      },
      'Payment processed',
    );

    res.json({ success: true, message: 'Payment processed', data: { payment } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payments/:id — Get a single payment by ID
 * Auth: patient who owns the payment, or admin
 */
export const getPaymentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const payment = await Payment.findById(req.params.id)
      .populate('invoiceId', 'invoiceNumber totalAmount paymentStatus')
      .populate('patientId', 'name email');

    if (!payment) return next(ApiError.notFound('Payment not found'));

    const userRole = req.user?.role;
    if (userRole !== ROLES.ADMIN && payment.patientId._id.toString() !== userId) {
      return next(ApiError.forbidden('You can only view your own payments'));
    }

    res.json({ success: true, data: { payment } });
  } catch (err) {
    next(err);
  }
};
