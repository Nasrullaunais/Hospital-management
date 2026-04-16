import { type Request, type Response } from 'express';
import { Prescription } from './prescription.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';

export const createPrescription = async (req: Request, res: Response) => {
  const { patientId, doctorId, medicalRecordId, items, notes } = req.body;
  if (!patientId || !doctorId || !items?.length) {
    throw new ApiError(400, 'patientId, doctorId and items are required');
  }
  const prescription = await Prescription.create({ patientId, doctorId, medicalRecordId, items, notes });
  res.status(201).json({ success: true, data: prescription });
};

export const getPrescriptionsByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const prescriptions = await Prescription.find({ patientId })
    .populate('doctorId', 'specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: prescriptions });
};

export const getPrescriptionById = async (req: Request, res: Response) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('doctorId', 'userId.name specialization')
    .populate('patientId', 'name email')
    .populate('items.medicineId');
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  res.json({ success: true, data: prescription });
};

export const getPendingPrescriptions = async (req: Request, res: Response) => {
  const prescriptions = await Prescription.find({ status: 'active' })
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'userId.name specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: prescriptions });
};

export const cancelPrescription = async (req: Request, res: Response) => {
  const prescription = await Prescription.findByIdAndUpdate(
    req.params.id, { status: 'cancelled' }, { new: true }
  );
  if (!prescription) throw new ApiError(404, 'Prescription not found');
  res.json({ success: true, data: prescription });
};
