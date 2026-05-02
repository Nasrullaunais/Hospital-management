import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Invoice } from './invoice.model.js';
import type { IInvoiceItem } from './invoice.model.js';
import { User } from '../auth/auth.model.js';
import { Appointment } from '../appointments/appointment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { s3Service } from '../../shared/services/s3.service.js';
import { formatFileReference } from '../../shared/utils/fileReference.js';
import { getRequestContext, logger } from '../../shared/utils/logger.js';
import { isMongoDuplicateKeyError } from '../../shared/utils/mongoHelpers.js';
import { ROLES } from '../../shared/constants/roles.js';
import { INVOICE_PREFIX, MAX_INVOICE_AMOUNT, DEFAULT_CONSULTATION_FEE, DEFAULT_LAB_FEE } from '../../shared/constants/billing.js';
import { Dispense } from '../dispensing/dispense.model.js';
import { LabReport } from '../labReports/labReport.model.js';
import { WardAssignment } from '../wardAssignments/wardAssignment.model.js';

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({
    issuedDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) },
  });
  return `${INVOICE_PREFIX}-${year}-${String(count + 1).padStart(4, '0')}`;
}

/** Compute total from items minus discount */
function computeTotal(items: IInvoiceItem[], discount = 0): number {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.max(0, subtotal - discount);
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
    if (!patient) return next(ApiError.badRequest('Patient not found'));

    if (req.body.appointmentId) {
      const appointment = await Appointment.findById(req.body.appointmentId);
      if (!appointment) {
        return next(ApiError.badRequest('Appointment not found'));
      }
      if (appointment.patientId.toString() !== req.body.patientId) {
        return next(ApiError.badRequest('Appointment does not belong to the specified patient'));
      }
    }

    const items = req.body.items as IInvoiceItem[];
    const discount = Number(req.body.discount) || 0;
    const totalAmount = computeTotal(items, discount);

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
      items,
      discount,
      issuedDate,
      dueDate,
      notes: req.body.notes,
    });

    // Auto-link dispensings: find unbilled dispensings whose items match invoice line items
    if (invoice.items && invoice.items.length > 0) {
      const medicineDescriptions = invoice.items
        .filter((item) => item.category === 'medicine')
        .map((item) => item.description.toLowerCase().replace(/^medicine:\s*/i, '').trim());

      if (medicineDescriptions.length > 0) {
        const unbilledDispensings = await Dispense.find({
          patientId: invoice.patientId,
          invoiceId: null,
          status: { $in: ['fulfilled', 'partial'] },
        });

        for (const disp of unbilledDispensings) {
          const hasMatchingItem = disp.dispensedItems.some((di) =>
            medicineDescriptions.some(
              (desc) =>
                di.medicineName.toLowerCase().includes(desc) ||
                desc.includes(di.medicineName.toLowerCase()),
            ),
          );
          if (hasMatchingItem) {
            disp.invoiceId = invoice._id;
            await disp.save();
          }
        }
      }
    }

    logger.info(
      {
        event: 'invoice_created',
        invoiceId: invoice._id.toString(),
        invoiceNumber,
        patientId: String(req.body.patientId),
        totalAmount,
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

/** GET /api/invoices/stats — Invoice statistics (Admin) */
export const getInvoiceStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pipeline = [
      // Compute totalAmount from items and discount for each invoice
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
      // Facet: group by status, overall totals, and this month
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

    res.json({
      success: true,
      data: {
        totalInvoices: totalStats.totalInvoices,
        totalAmount: Math.round(totalStats.totalAmount * 100) / 100,
        byStatus,
        thisMonth: {
          count: thisMonthData.count,
          total: Math.round(thisMonthData.total * 100) / 100,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/suggestions/:patientId — Auto-detect unbilled charges (Staff/Admin) */
export const getSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patientId = req.params.patientId;

    // ── Step A: Build exclusion list from existing invoices ──────────────────
    const existingInvoices = await Invoice.find({ patientId });
    const alreadyBilledAppointmentIds = existingInvoices
      .map((inv) => inv.appointmentId)
      .filter(Boolean)
      .map((id) => id!.toString());

    const alreadyLinkedDispenseIds = await Dispense.find({ patientId, invoiceId: { $ne: null } }).distinct('_id');

    // Build a set of existing invoice item descriptions for fuzzy matching
    const existingDescriptions = new Set<string>();
    for (const inv of existingInvoices) {
      for (const item of inv.items) {
        existingDescriptions.add(item.description.toLowerCase());
      }
    }

    // ── Step B: Suggestions from dispensings ─────────────────────────────────
    const unbilledDispensings = await Dispense.find({
      patientId,
      invoiceId: null,
      status: { $in: ['fulfilled', 'partial'] },
    }).populate('dispensedItems.medicineId', 'name');

    const dispensingSuggestions = [];
    for (const dispensing of unbilledDispensings) {
      for (const item of dispensing.dispensedItems) {
        dispensingSuggestions.push({
          source: 'dispensing' as const,
          sourceId: dispensing._id.toString(),
          description: `Medicine: ${item.medicineName}`,
          category: 'medicine' as const,
          quantity: item.quantityDispensed,
          unitPrice: 0,
          date: dispensing.fulfilledAt,
        });
      }
    }

    // ── Step C: Suggestions from appointments ────────────────────────────────
    let appointmentFilter: Record<string, unknown> = {
      patientId,
      status: 'Completed',
      _id: { $nin: alreadyBilledAppointmentIds },
    };

    if (req.query.appointmentId) {
      appointmentFilter._id = req.query.appointmentId;
    }

    const unbilledAppointments = await Appointment.find(appointmentFilter).populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' },
    });

    const appointmentSuggestions = unbilledAppointments.map((appt) => {
      const doctorName = (appt.doctorId as unknown as { userId?: { name?: string } })?.userId?.name || 'Unknown';
      return {
        source: 'appointment' as const,
        sourceId: appt._id.toString(),
        description: `Consultation — Dr. ${doctorName}`,
        category: 'consultation' as const,
        quantity: 1,
        unitPrice: DEFAULT_CONSULTATION_FEE,
        date: appt.appointmentDate,
      };
    });

    // ── Step D: Suggestions from lab reports ─────────────────────────────────
    const labReports = await LabReport.find({
      patientId,
      status: { $in: ['completed', 'reviewed'] },
    });

    const labSuggestions = labReports
      .filter((lab) => {
        const labDesc = `lab: ${lab.labType.replace(/_/g, ' ')}`;
        // Check if this lab's description already appears in any existing invoice
        for (const existingDesc of existingDescriptions) {
          if (existingDesc.includes(labDesc) || labDesc.includes(existingDesc)) return false;
        }
        return true;
      })
      .map((lab) => ({
        source: 'lab_report' as const,
        sourceId: lab._id.toString(),
        description: `Lab: ${lab.labType.replace(/_/g, ' ')}`,
        category: 'lab_test' as const,
        quantity: 1,
        unitPrice: DEFAULT_LAB_FEE,
        date: lab.testDate || lab.createdAt,
      }));

    // ── Step E: Return grouped, sorted by date desc ──────────────────────────
    const allSuggestions = [...dispensingSuggestions, ...appointmentSuggestions, ...labSuggestions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    res.json({
      success: true,
      data: {
        patientId,
        suggestions: allSuggestions,
        alreadyBilledCount: existingInvoices.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/invoices/pending-patients — Patients needing billing (Receptionist/Admin) */
export const getPendingBillingPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // ── Step 1: Discharged patients with ward info ─────────────────────────────
    const dischargedAssignments = await WardAssignment.find({ status: 'discharged' })
      .populate('patientId', 'name email')
      .populate('wardId', 'name')
      .sort({ actualDischarge: -1 })
      .lean();

    // ── Step 2: Patients with unbilled dispensings ─────────────────────────────
    const unbilledDispensingPatientIds = (
      await Dispense.distinct('patientId', {
        invoiceId: null,
        status: { $in: ['fulfilled', 'partial'] },
      })
    ).map((id) => id.toString());

    // ── Step 3: Appointments completed but not yet invoiced ────────────────────
    const invoicedAppts = await Invoice.find({ appointmentId: { $ne: null } }, 'appointmentId').lean();
    const invoicedApptIdSet = new Set(
      invoicedAppts
        .map((i) => i.appointmentId)
        .filter(Boolean)
        .map((id) => id!.toString()),
    );

    const unbilledApptPatientIds = (
      await Appointment.distinct('patientId', {
        status: 'Completed',
        _id: { $nin: [...invoicedApptIdSet].map((id) => new mongoose.Types.ObjectId(id)) },
      })
    ).map((id) => id.toString());

    // ── Step 4: Build unique patient set + discharged ward info map ────────────
    const dischargedInfoMap = new Map<string, { wardName: string; actualDischarge: Date }>();
    const allPatientIds = new Set<string>();

    for (const assignment of dischargedAssignments) {
      const patient = assignment.patientId as { _id: mongoose.Types.ObjectId } | undefined;
      if (!patient) continue;
      const pid = patient._id.toString();
      const ward = assignment.wardId as { name?: string } | undefined;

      if (!dischargedInfoMap.has(pid)) {
        dischargedInfoMap.set(pid, {
          wardName: ward?.name || 'Unknown Ward',
          actualDischarge: assignment.actualDischarge || assignment.updatedAt,
        });
      }
      allPatientIds.add(pid);
    }

    for (const id of unbilledDispensingPatientIds) allPatientIds.add(id);
    for (const id of unbilledApptPatientIds) allPatientIds.add(id);

    // ── Step 5: Aggregate details per patient ───────────────────────────────────
    const result: Array<{
      patientId: string;
      patientName: string;
      patientEmail: string;
      unbilledCount: number;
      unbilledSources: string[];
      discharged: boolean;
      wardName: string;
      lastActivity: string;
    }> = [];

    for (const patientId of allPatientIds) {
      const user = await User.findById(patientId, 'name email createdAt').lean();
      if (!user) continue;

      // Count unbilled dispensings for this patient
      const unbilledDispensingCount = await Dispense.countDocuments({
        patientId,
        invoiceId: null,
        status: { $in: ['fulfilled', 'partial'] },
      });

      // Count unbilled completed appointments for this patient
      const unbilledApptCount = await Appointment.countDocuments({
        patientId,
        status: 'Completed',
        _id: { $nin: [...invoicedApptIdSet].map((id) => new mongoose.Types.ObjectId(id)) },
      });

      // Get latest ward assignment to check current status
      const latestAssignment = await WardAssignment.findOne({ patientId })
        .sort({ updatedAt: -1 })
        .populate('wardId', 'name')
        .lean();

      const unbilledSources: string[] = [];
      if (unbilledDispensingCount > 0) unbilledSources.push('dispensing');
      if (unbilledApptCount > 0) unbilledSources.push('appointment');
      if (dischargedInfoMap.has(patientId)) unbilledSources.push('ward');

      const dischargedInfo = dischargedInfoMap.get(patientId);
      const totalUnbilled = unbilledDispensingCount + unbilledApptCount + (dischargedInfo ? 1 : 0);

      // Determine most recent activity timestamp
      const lastActivity =
        dischargedInfo?.actualDischarge?.toISOString() ||
        (latestAssignment?.actualDischarge as Date | undefined)?.toISOString() ||
        (user.createdAt as Date | undefined)?.toISOString() ||
        new Date().toISOString();

      result.push({
        patientId,
        patientName: user.name,
        patientEmail: user.email,
        unbilledCount: totalUnbilled,
        unbilledSources,
        discharged: dischargedInfoMap.has(patientId),
        wardName:
          dischargedInfo?.wardName ||
          ((latestAssignment?.wardId as { name?: string } | undefined)?.name ?? 'N/A'),
        lastActivity,
      });
    }

    // ── Step 6: Sort by lastActivity descending ─────────────────────────────────
    result.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    res.json({ success: true, data: result });
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
    // Unlink dispensings so they can be re-billed
    await Dispense.updateMany({ invoiceId: req.params.id }, { $set: { invoiceId: null } });

    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return next(ApiError.notFound('Invoice not found'));
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};
