import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Dispense } from './dispense.model.js';
import { Medicine } from '../pharmacy/medicine.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

export const dispensePrescription = async (req: Request, res: Response) => {
  const { prescriptionId, dispensedItems } = req.body;
  const pharmacistId = req.user!.id;

  if (!prescriptionId || !dispensedItems?.length) {
    throw new ApiError(400, 'prescriptionId and dispensedItems are required');
  }

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  if (prescription.status !== 'active') {
    throw new ApiError(400, `Cannot dispense a prescription with status '${prescription.status}'`);
  }

  // Validate each dispensed item and deduct stock
  for (const item of dispensedItems) {
    if (!item.medicineId || typeof item.quantityDispensed !== 'number' || item.quantityDispensed <= 0) {
      throw new ApiError(400, 'Each dispensed item must have medicineId and quantityDispensed > 0');
    }

    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine) throw new ApiError(404, `Medicine ${item.medicineId} not found`);

    if (medicine.stockQuantity < item.quantityDispensed) {
      throw new ApiError(
        400,
        `Insufficient stock for ${medicine.name}: available ${medicine.stockQuantity}, requested ${item.quantityDispensed}`
      );
    }

    // Atomic stock deduction
    await Medicine.findByIdAndUpdate(item.medicineId, {
      $inc: { stockQuantity: -item.quantityDispensed }
    });
  }

  // Build dispensedItems with full details from prescription
  const fullDispensedItems = dispensedItems.map((item: any) => {
    const rxItem = prescription.items.find(
      (pi: any) => pi.medicineId.toString() === item.medicineId
    );
    return {
      medicineId: item.medicineId,
      medicineName: rxItem?.medicineName || '',
      dosage: rxItem?.dosage || '',
      quantityPrescribed: rxItem?.quantity || 0,
      quantityDispensed: item.quantityDispensed,
      instructions: rxItem?.instructions || ''
    };
  });

  // Create dispense record
  const dispense = await Dispense.create({
    prescriptionId,
    patientId: prescription.patientId,
    pharmacistId,
    dispensedItems: fullDispensedItems,
    status: 'fulfilled'
  });

  // Mark prescription as fulfilled
  prescription.status = 'fulfilled';
  await prescription.save();

  res.status(201).json({ success: true, data: dispense });
};

export const getDispensesByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;

  // Ownership check: only the patient themselves or admin can view
  const isOwner = req.user!.id === patientId || req.user!.role === 'admin';
  if (!isOwner) {
    throw new ApiError(403, 'You are not authorized to view these dispense records');
  }

  const dispenses = await Dispense.find({ patientId })
    .populate('pharmacistId', 'name')
    .populate('prescriptionId')
    .sort({ fulfilledAt: -1 });

  res.json({ success: true, data: dispenses });
};
