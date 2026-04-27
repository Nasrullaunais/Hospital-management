import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Invoice } from './invoice.model.js';
import { User } from '../auth/auth.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';
import { isMongoDuplicateKeyError } from '../../shared/utils/mongoHelpers.js';
import { ROLES } from '../../shared/constants/roles.js';
import { INVOICE_PREFIX, MAX_INVOICE_AMOUNT } from '../../shared/constants/billing.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    issuedDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
  });
  return `${INVOICE_PREFIX}-${year}-${String(count + 1).padStart(4, '0')}`;
}

let _lastOverdueMarkAt = 0;
const OVERDUE_CACHE_TTL_MS = 5 * 60 * 1000;

async function markOverdueInvoices(): Promise<void> {
  const now = Date.now();
  if (now - _lastOverdueMarkAt < OVERDUE_CACHE_TTL_MS) return;
  _lastOverdueMarkAt = now;
  await Invoice.updateMany(
    { paymentStatus: 'Unpaid', dueDate: { $lt: new Date(now) } },
    { $set: { paymentStatus: 'Overdue' } },
  );
}

/** POST /api/invoices — Create invoice (Staff/Admin) */
export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const patient = await User.exists({ _id: req.body.patientId });
    if (!patient) return next(new ApiError.badRequest('Patient not found'));

    if (req.body.appointmentId) {
      const appointment = await Appointment.findById(req.body.appointmentId);
      if (!appointment) {
        return next(new ApiError.badRequest('Appointment not found'));
      }
      if (appointment.patientId.toString() !== req.body.patientId) {
        return next(new ApiError.badRequest('Appointment does not belong to the specified patient'));
      }
    }

    const totalAmount = Number(req.body.totalAmount);
    if (totalAmount > MAX_INVOICE_AMOUNT) {
      return next(new ApiError(400, `Total amount cannot exceed ${MAX_INVOICE_AMOUNT}`));
    }

    const invoiceNumber = await generateInvoiceNumber();
    const issuedDate = new Date();
    const dueDate = new Date(issuedDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await Invoice.create({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      invoiceNumber,
      totalAmount,
      issuedDate,
      dueDate,
    });

    logger.info(
      {
        event: 'invoice_created',
        invoiceId: invoice._id.toString(),
        invoiceNumber,
        patientId: String(req.body.patientId),
        totalAmount: req.body.totalAmount,
        ...getRequestContext(req),
      },
      'Invoice created',
    );

    res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      return next(new ApiError(409, 'Invoice with this number already exists'));
    }
    next(err);
  }
};

/** GET /api/invoices/:id — Get a single invoice by ID (Patient own or Admin) */
export const getInvoiceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    const invoice = await Invoice.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('appointmentId', 'appointmentDate status');

    if (!invoice) return next(ApiError.notFound('Invoice not found'));

    const userRole = req.user?.role;
    if (userRole !== 'admin' && invoice.patientId._id.toString() !== userId) {
      return next(ApiError.forbidden('You can only view your own invoices'));
    }

    res.json({ success: true, data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/my-bills — Patient's own invoices */
export const getMyBills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    await markOverdueInvoices();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find({ patientId: userId })
        .populate('appointmentId', 'appointmentDate status')
        .sort({ issuedDate: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments({ patientId: userId }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        count: invoices.length,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices — All invoices (Staff/Admin) */
export const getAllInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await markOverdueInvoices();

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.paymentStatus = req.query.status;
    if (req.query.patientId) filter.patientId = req.query.patientId;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('patientId', 'name email')
        .populate('appointmentId', 'appointmentDate')
        .sort({ issuedDate: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        count: invoices.length,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/invoices/:id/upload-receipt — Patient uploads payment receipt */
export const uploadPaymentReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(ApiError.unauthorized());

    let paymentReceiptUrl: string;

    if (req.body.fileKey && typeof req.body.fileKey === 'string' && req.body.fileKey.trim().length > 0) {
      // S3 presigned upload flow: verify the fileKey belongs to this user
      await s3Service.verifyAndConsume(userId, req.body.fileKey);
      paymentReceiptUrl = formatFileReference('s3', req.body.fileKey);
    } else if (req.file) {
      // Legacy multer upload: store with local protocol
      paymentReceiptUrl = formatFileReference('local', `/uploads/${req.file.filename}`);
    } else {
      return next(ApiError.badRequest('Payment receipt file is required'));
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, patientId: userId },
      {
        paymentReceiptUrl,
        paymentStatus: 'Pending Verification',
      },
      { returnDocument: 'after' },
    );

    if (!invoice) return next(ApiError.notFound('Invoice not found or you do not have permission'));

    logger.info(
      {
        event: 'invoice_receipt_uploaded',
        invoiceId: invoice._id.toString(),
        patientId: userId,
        ...getRequestContext(req),
      },
      'Invoice payment receipt uploaded',
    );

    res.json({ success: true, message: 'Receipt uploaded. Awaiting verification.', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/invoices/:id/verify — Staff verifies payment, marks as Paid */
export const verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Validation failed'));
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: req.body.paymentStatus },
      { returnDocument: 'after' },
    );

    if (!invoice) return next(ApiError.notFound('Invoice not found'));

    logger.info(
      {
        event: 'invoice_payment_verified',
        invoiceId: invoice._id.toString(),
        ...getRequestContext(req),
      },
      'Invoice payment verified',
    );

    res.json({ success: true, message: 'Payment verified', data: { invoice } });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/invoices/:id — Admin only */
export const deleteInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== ROLES.ADMIN) {
      return next(ApiError.forbidden('Only admins can delete invoices'));
    }
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return next(ApiError.notFound('Invoice not found'));
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};
