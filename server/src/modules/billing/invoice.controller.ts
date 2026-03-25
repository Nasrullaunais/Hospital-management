import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Invoice } from './invoice.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

/** POST /api/invoices — Create invoice (Staff/Admin) */
export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const invoice = await Invoice.create({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      totalAmount: req.body.totalAmount,
    });

    res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/my-bills — Patient's own invoices */
export const getMyBills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoices = await Invoice.find({ patientId: req.user!.id })
      .populate('appointmentId', 'appointmentDate status')
      .sort({ issuedDate: -1 });

    res.json({ success: true, data: { invoices, count: invoices.length } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices — All invoices (Staff/Admin) */
export const getAllInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.paymentStatus = req.query.status;
    if (req.query.patientId) filter.patientId = req.query.patientId;

    const invoices = await Invoice.find(filter)
      .populate('patientId', 'name email')
      .populate('appointmentId', 'appointmentDate')
      .sort({ issuedDate: -1 });

    res.json({ success: true, data: { invoices, count: invoices.length } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/invoices/:id/pay — Patient uploads payment receipt */
export const uploadPaymentReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) return next(ApiError.badRequest('Payment receipt file is required'));

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, patientId: req.user!.id },
      {
        paymentReceiptUrl: `/uploads/${req.file.filename}`,
        paymentStatus: 'Pending Verification',
      },
      { new: true },
    );

    if (!invoice) return next(ApiError.notFound('Invoice not found or you do not have permission'));
    res.json({ success: true, message: 'Receipt uploaded. Awaiting verification.', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/invoices/:id/verify — Staff verifies payment, marks as Paid */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'Paid' },
      { new: true },
    );

    if (!invoice) return next(ApiError.notFound('Invoice not found'));
    res.json({ success: true, message: 'Payment verified', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/invoices/:id — Admin only */
export const deleteInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return next(ApiError.notFound('Invoice not found'));
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};
