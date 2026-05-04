import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Dispense } from './dispense.model.js';
import { Medicine } from '../pharmacy/medicine.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { logger } from '../../shared/utils/logger.js';
import { ROLES } from '../../shared/constants/roles.js';
import { PRESCRIPTION_STATUS } from '../../shared/constants/prescriptionStatus.js';
import { parsePagination, buildPaginatedResponse } from '../../shared/types/pagination.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

interface DispensedItemInput {
  medicineId: string;
  medicineName: string;
  quantityDispensed: number;
}

interface PrescriptionItem {
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  dosage: string;
  quantity: number;
  instructions?: string;
}

interface FullDispensedItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  instructions: string;
}

export const dispensePrescription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { prescriptionId, dispensedItems } = req.body as { prescriptionId: string; dispensedItems: DispensedItemInput[] };
  const pharmacistId = req.user?.id;
  if (!pharmacistId) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (!prescriptionId || !dispensedItems?.length) {
    return next(new ApiError(400, 'prescriptionId and dispensedItems are required'));
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) return next(new ApiError(404, 'Prescription not found'));
  if (prescription.status !== PRESCRIPTION_STATUS.ACTIVE) {
    return next(new ApiError(400, `Cannot dispense a prescription with status '${prescription.status}'`));
  }

  const session = await mongoose.startSession();
  let committed = false;

  try {
    session.startTransaction();

    for (const item of dispensedItems) {
      if (
        !item.medicineId ||
        typeof item.quantityDispensed !== 'number' ||
        item.quantityDispensed <= 0
      ) {
        return next(new ApiError(400, 'Each dispensed item must have medicineId and quantityDispensed > 0'));
      }

      const medicine = await Medicine.findOneAndUpdate(
        { _id: item.medicineId, stockQuantity: { $gte: item.quantityDispensed } },
        { $inc: { stockQuantity: -item.quantityDispensed } },
        { returnDocument: 'after', session },
      );

      if (!medicine) {
        const current = await Medicine.findById(item.medicineId).session(session);
        if (!current) {
          return next(new ApiError(404, `Medicine ${item.medicineId} not found`));
        }
        return next(new ApiError(
          400,
          `Insufficient stock for ${current.name}: available ${current.stockQuantity}, requested ${item.quantityDispensed}`,
        ));
      }

      if (item.medicineName && item.medicineName !== medicine.name) {
        return next(new ApiError(400, `Medicine name mismatch for ${medicine.name}: expected '${medicine.name}', got '${item.medicineName}'`));
      }
    }

    const fullDispensedItems: FullDispensedItem[] = dispensedItems.map((item) => {
      const rxItem = (prescription.items as any).find(
        (pi: PrescriptionItem) => pi.medicineId.toString() === item.medicineId,
      );
      return {
        medicineId: item.medicineId,
        medicineName: rxItem?.medicineName || '',
        dosage: rxItem?.dosage || '',
        quantityPrescribed: rxItem?.quantity || 0,
        quantityDispensed: item.quantityDispensed,
        instructions: rxItem?.instructions || '',
      };
    });

    const dispense = await new Dispense({
      prescriptionId,
      patientId: prescription.patientId,
      pharmacistId,
      dispensedItems: fullDispensedItems,
      status: 'fulfilled',
    }).save({ session });

    prescription.status = PRESCRIPTION_STATUS.FULFILLED;
    await prescription.save({ session });

    await session.commitTransaction();
    committed = true;

    res.status(201).json({ success: true, data: dispense });
  } catch (err) {
    if (!committed) {
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        logger.error({ event: 'abort_transaction_failed', err: abortErr }, '[dispense] abortTransaction failed');
      }
    }
    next(err);
  } finally {
    await session.endSession();
  }
};

export const getDispensesByPatient = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const pid = String(req.params.patientId);
  const { page, limit, skip } = parsePagination(req.query);

  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) {
    return next(new ApiError(401, 'Authentication required'));
  }

  const isPatient = userId === pid;
  const isAdmin = userRole === ROLES.ADMIN;
  const isPharmacist = userRole === ROLES.PHARMACIST;

  if (isPharmacist && !isPatient) {
    const [dispenses, total] = await Promise.all([
      Dispense.find({ patientId: pid, pharmacistId: userId })
        .populate('pharmacistId', 'name')
        .populate('prescriptionId')
        .sort({ fulfilledAt: -1 })
        .skip(skip)
        .limit(limit),
      Dispense.countDocuments({ patientId: pid, pharmacistId: userId }),
    ]);
    const paginatedData = buildPaginatedResponse(dispenses, total, page, limit);
    res.json({ success: true, data: paginatedData });
  }
  if (!isPatient && !isAdmin) {
    return next(new ApiError(403, 'You are not authorized to view these dispense records'));
  }

  if (!mongoose.Types.ObjectId.isValid(pid)) {
    return next(new ApiError(400, 'Invalid patient ID format'));
  }

  const [dispenses, total] = await Promise.all([
    Dispense.find({ patientId: pid })
      .populate('pharmacistId', 'name')
      .populate('prescriptionId')
      .sort({ fulfilledAt: -1 })
      .skip(skip)
      .limit(limit),
    Dispense.countDocuments({ patientId: pid }),
  ]);

  const paginatedData = buildPaginatedResponse(dispenses, total, page, limit);
  res.json({ success: true, data: paginatedData });
});
