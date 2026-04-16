import { Request, Response } from 'express';
import { Dispense } from './dispense.model.js';
import { Medicine } from '../pharmacy/medicine.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

export const dispensePrescription = async (req: Request, res: Response) => {
  const { prescriptionId, dispensedItems } = req.body;
  // req.user.id comes from JWT payload (id field, not _id)
  const pharmacistId = new (require('mongoose').Types.ObjectId)(req.user!.id);

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  if (prescription.status !== 'active') throw new ApiError(400, 'Prescription is not active');

  // Deduct stock for each item
  for (const item of dispensedItems) {
    const medicine = await Medicine.findById(item.medicineId);
    if (!medicine) throw new ApiError(404, `Medicine ${item.medicineId} not found`);
    if (medicine.stockQuantity < item.quantityDispensed) {
      throw new ApiError(400, `Insufficient stock for ${medicine.name}: available ${medicine.stockQuantity}, requested ${item.quantityDispensed}`);
    }
    medicine.stockQuantity -= item.quantityDispensed;
    await medicine.save();
  }

  const dispenseData = dispensedItems.map((item: any) => {
    const rxItem = prescription.items.find((pi: any) => pi.medicineId.toString() === item.medicineId);
    return {
      medicineId: item.medicineId,
      medicineName: rxItem?.medicineName || '',
      dosage: rxItem?.dosage || '',
      quantityPrescribed: rxItem?.quantity || 0,
      quantityDispensed: item.quantityDispensed,
      instructions: rxItem?.instructions || ''
    };
  });

  const dispense = await Dispense.create([{
    prescriptionId,
    patientId: prescription.patientId,
    pharmacistId,
    dispensedItems: dispenseData,
    status: 'fulfilled'
  }]);

  await Prescription.findByIdAndUpdate(prescriptionId, { status: 'fulfilled' });

  res.status(201).json({ success: true, data: dispense[0] });
};

export const getDispensesByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userId !== patientId && userRole !== 'admin') {
    throw new ApiError(403, 'You are not authorized to view this patient\'s dispenses');
  }

  const dispenses = await Dispense.find({ patientId })
    .populate('pharmacistId', 'name')
    .populate('prescriptionId')
    .sort({ fulfilledAt: -1 });
  res.json({ success: true, data: dispenses });
};
