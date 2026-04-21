import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Dispense } from './dispense.model.js';
import { Medicine } from '../pharmacy/medicine.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { ROLES } from '../../shared/constants/roles.js';
import { PRESCRIPTION_STATUS } from '../../shared/constants/prescriptionStatus.js';

export const dispensePrescription = async (req: Request, res: Response) => {
  const { prescriptionId, dispensedItems } = req.body;
  const pharmacistId = req.user!.id;

  if (!prescriptionId || !dispensedItems?.length) {
    throw new ApiError(400, 'prescriptionId and dispensedItems are required');
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  if (prescription.status !== PRESCRIPTION_STATUS.ACTIVE) {
    throw new ApiError(400, `Cannot dispense a prescription with status '${prescription.status}'`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of dispensedItems) {
      if (
        !item.medicineId ||
        typeof item.quantityDispensed !== 'number' ||
        item.quantityDispensed <= 0
      ) {
        throw new ApiError(400, 'Each dispensed item must have medicineId and quantityDispensed > 0');
      }

      const medicine = await Medicine.findOneAndUpdate(
        { _id: item.medicineId, stockQuantity: { $gte: item.quantityDispensed } },
        { $inc: { stockQuantity: -item.quantityDispensed } },
        { new: true, session },
      );

      if (!medicine) {
        const current = await Medicine.findById(item.medicineId).session(session);
        if (!current) {
          throw new ApiError(404, `Medicine ${item.medicineId} not found`);
        }
        throw new ApiError(
          400,
          `Insufficient stock for ${current.name}: available ${current.stockQuantity}, requested ${item.quantityDispensed}`,
        );
      }
    }

    const fullDispensedItems = dispensedItems.map((item: any) => {
      const rxItem = prescription.items.find(
        (pi: any) => pi.medicineId.toString() === item.medicineId,
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

    const dispense = await Dispense.create([{
      prescriptionId,
      patientId: prescription.patientId,
      pharmacistId,
      dispensedItems: fullDispensedItems,
      status: 'fulfilled',
    }], { session });

    prescription.status = PRESCRIPTION_STATUS.FULFILLED;
    await prescription.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: dispense[0] });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

export const getDispensesByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;

  const isOwner = req.user!.id === patientId || req.user!.role === ROLES.ADMIN;
  if (!isOwner) {
    throw new ApiError(403, 'You are not authorized to view these dispense records');
  }

  const dispenses = await Dispense.find({ patientId })
    .populate('pharmacistId', 'name')
    .populate('prescriptionId')
    .sort({ fulfilledAt: -1 });

  res.json({ success: true, data: dispenses });
};
