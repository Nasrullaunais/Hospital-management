import type mongoose from 'mongoose';
import { Invoice, type IInvoiceItem } from './invoice.model.js';
import { User } from '../auth/auth.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { logger } from '../../shared/utils/logger.js';
import { isMongoDuplicateKeyError } from '../../shared/utils/mongoHelpers.js';
import { INVOICE_PREFIX, MAX_INVOICE_AMOUNT } from '../../shared/constants/billing.js';
import { Dispense } from '../dispensing/dispense.model.js';
import { buildPaginatedResponse, parsePagination } from '../../shared/types/pagination.js';
import type { PaginatedResponse } from '../../shared/types/pagination.js';
import { linkDispensingsToInvoice } from './invoice.linking.service.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    issuedDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
  });
  return `${INVOICE_PREFIX}-${year}-${String(count + 1).padStart(4, '0')}`;
}

export function computeTotal(items: IInvoiceItem[], discount = 0): number {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.max(0, subtotal - discount);
}

// ── Scheduled job ───────────────────────────────────────────────────────────────

export async function markOverdueInvoices(): Promise<void> {
  const result = await Invoice.updateMany(
    { paymentStatus: 'Unpaid', dueDate: { $lt: new Date() } },
    { $set: { paymentStatus: 'Overdue' } },
  );
  if (result.modifiedCount > 0) {
    logger.info(
      { event: 'invoices_marked_overdue', count: result.modifiedCount },
      `Marked ${result.modifiedCount} invoices as overdue`,
    );
  }
}

// ── CRUD Operations ─────────────────────────────────────────────────────────────

export interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string;
  items: IInvoiceItem[];
  discount?: number;
  notes?: string;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceDocument> {
  const patient = await User.exists({ _id: input.patientId });
  if (!patient) throw ApiError.badRequest('Patient not found');

  if (input.appointmentId) {
    const appointment = await Appointment.findById(input.appointmentId);
    if (!appointment) throw ApiError.badRequest('Appointment not found');
    if (appointment.patientId.toString() !== input.patientId) {
      throw ApiError.badRequest('Appointment does not belong to the specified patient');
    }
  }

  const discount = Number(input.discount) || 0;
  const totalAmount = computeTotal(input.items, discount);

  if (totalAmount > MAX_INVOICE_AMOUNT) {
    throw ApiError.badRequest(`Total amount cannot exceed ${MAX_INVOICE_AMOUNT}`);
  }

  const issuedDate = new Date();
  const dueDate = new Date(issuedDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Retry on invoice number collision (race condition in generateInvoiceNumber)
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const invoiceNumber = await generateInvoiceNumber();
    try {
      const invoice = await Invoice.create({
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        invoiceNumber,
        items: input.items,
        discount,
        issuedDate,
        dueDate,
        notes: input.notes,
      });

      // Auto-link dispensings whose items match invoice line items
      await linkDispensingsToInvoice(invoice);

      logger.info(
        {
          event: 'invoice_created',
          invoiceId: invoice._id.toString(),
          invoiceNumber,
          patientId: input.patientId,
          totalAmount,
        },
        'Invoice created',
      );

      return invoice;
    } catch (err) {
      if (isMongoDuplicateKeyError(err) && attempt < MAX_RETRIES - 1) {
        logger.warn(
          { event: 'invoice_number_collision', invoiceNumber, attempt: attempt + 1 },
          'Invoice number collision, retrying with new number',
        );
        continue;
      }
      throw err;
    }
  }

  // Should never reach here due to the final throw in the loop
  throw new ApiError(409, 'Invoice with this number already exists');
}

export async function getInvoiceById(
  invoiceId: string,
  userId: string,
  userRole: string,
): Promise<InvoiceDocument> {
  const invoice = await Invoice.findById(invoiceId)
    .populate('patientId', 'name email phone')
    .populate('appointmentId', 'appointmentDate status');

  if (!invoice) throw ApiError.notFound('Invoice not found');

  // Authorization: admin can view any; patients can only view their own
  const patientId = (invoice.patientId as { _id: mongoose.Types.ObjectId })._id.toString();
  if (userRole !== 'admin' && patientId !== userId) {
    throw ApiError.forbidden('You can only view your own invoices');
  }

  return invoice;
}

export async function getMyInvoices(
  userId: string,
  query: { page?: unknown; limit?: unknown },
): Promise<PaginatedResponse<InvoiceDocument>> {
  const { page, limit, skip } = parsePagination(query);

  const [invoices, total] = await Promise.all([
    Invoice.find({ patientId: userId })
      .populate('appointmentId', 'appointmentDate status')
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments({ patientId: userId }),
  ]);

  return buildPaginatedResponse(invoices, total, page, limit);
}

export async function getAllInvoices(
  query: { page?: unknown; limit?: unknown; status?: unknown; patientId?: unknown },
): Promise<PaginatedResponse<InvoiceDocument>> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.paymentStatus = query.status;
  if (query.patientId) filter.patientId = query.patientId;

  const { page, limit, skip } = parsePagination(query);

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('patientId', 'name email')
      .populate('appointmentId', 'appointmentDate')
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);

  return buildPaginatedResponse(invoices, total, page, limit);
}

export async function uploadPaymentReceipt(
  invoiceId: string,
  patientId: string,
  paymentReceiptUrl: string,
): Promise<InvoiceDocument> {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: invoiceId, patientId },
    { paymentReceiptUrl, paymentStatus: 'Pending Verification' },
    { returnDocument: 'after' },
  );

  if (!invoice) throw ApiError.notFound('Invoice not found or you do not have permission');

  logger.info(
    {
      event: 'invoice_receipt_uploaded',
      invoiceId: invoice._id.toString(),
      patientId,
    },
    'Invoice payment receipt uploaded',
  );

  return invoice;
}

export async function verifyPayment(
  invoiceId: string,
  paymentStatus: string,
): Promise<InvoiceDocument> {
  const invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    { paymentStatus },
    { returnDocument: 'after' },
  );

  if (!invoice) throw ApiError.notFound('Invoice not found');

  logger.info(
    {
      event: 'invoice_payment_verified',
      invoiceId: invoice._id.toString(),
    },
    'Invoice payment verified',
  );

  return invoice;
}

export async function getInvoiceStats(): Promise<InvoiceStats> {
  const pipeline = [
    {
      $addFields: {
        computedTotal: {
          $max: [
            { $toDouble: 0 },
            {
              $subtract: [
                {
                  $sum: {
                    $map: {
                      input: '$items',
                      as: 'item',
                      in: { $multiply: ['$$item.quantity', '$$item.unitPrice'] },
                    },
                  },
                },
                { $ifNull: ['$discount', 0] },
              ],
            },
          ],
        },
      },
    },
    {
      $facet: {
        byStatus: [
          { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$computedTotal' } } },
        ],
        totalStats: [
          { $group: { _id: null, totalInvoices: { $sum: 1 }, totalAmount: { $sum: '$computedTotal' } } },
        ],
        thisMonth: [
          {
            $match: {
              issuedDate: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              },
            },
          },
          { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$computedTotal' } } },
        ],
      },
    },
  ];

  const [result] = await Invoice.aggregate(pipeline);

  const byStatus: Record<string, { count: number; total: number }> = {};
  for (const status of result.byStatus) {
    byStatus[status._id] = { count: status.count, total: Math.round(status.total * 100) / 100 };
  }

  const totalStats = result.totalStats[0] || { totalInvoices: 0, totalAmount: 0 };
  const thisMonthData = result.thisMonth[0] || { count: 0, total: 0 };

  return {
    totalInvoices: totalStats.totalInvoices,
    totalAmount: Math.round(totalStats.totalAmount * 100) / 100,
    byStatus,
    thisMonth: {
      count: thisMonthData.count,
      total: Math.round(thisMonthData.total * 100) / 100,
    },
  };
}

export async function deleteInvoice(invoiceId: string, userRole: string): Promise<void> {
  if (userRole !== 'admin') {
    throw ApiError.forbidden('Only admins can delete invoices');
  }
  // Unlink dispensings so they can be re-billed
  await Dispense.updateMany({ invoiceId }, { $set: { invoiceId: null } });

  const invoice = await Invoice.findByIdAndDelete(invoiceId);
  if (!invoice) throw ApiError.notFound('Invoice not found');
}

// ── Types ───────────────────────────────────────────────────────────────────────

type InvoiceDocument = InstanceType<typeof Invoice>;

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; total: number }>;
  thisMonth: { count: number; total: number };
}
