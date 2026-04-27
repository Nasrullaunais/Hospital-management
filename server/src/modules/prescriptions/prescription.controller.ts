import { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { Prescription } from './prescription.model.js';
import { findDoctorByUserId } from '../../shared/utils/doctorLookup.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { PRESCRIPTION_STATUS } from '../../shared/constants/prescriptionStatus.js';
import { ROLES } from '../../shared/constants/roles.js';

export const createPrescription = async (req: Request, res: Response) => {
  const { patientId, medicalRecordId, items, notes } = req.body;

  if (!patientId || !items?.length) {
    throw new ApiError(400, 'patientId and items are required');
  }

  if (medicalRecordId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(medicalRecordId)) {
      throw new ApiError(400, 'medicalRecordId must be a valid ObjectId');
    }
  }

  // Use req.user.id from JWT as the actual doctorId - prevents prescription forgery
  // doctorId in Prescription model references Doctor document (_id), not User id
  const doctorProfile = await findDoctorByUserId(req.user.id);
  if (!doctorProfile) {
    throw new ApiError(403, 'Doctor profile not found for current user');
  }
  const doctorId = doctorProfile._id;

  // Validate each item has required fields
  for (const item of items) {
    if (!item.medicineId || !item.dosage || !item.quantity || item.quantity <= 0) {
      throw new ApiError(400, 'Each item must have medicineId, dosage, and quantity > 0');
    }
    if (item.dosage && typeof item.dosage === 'string' && item.dosage.trim().length === 0) {
      throw new ApiError(400, 'Each item must have a non-empty dosage');
    }
  }

  // If medicalRecordId is provided, verify it belongs to the specified patient
  if (medicalRecordId !== undefined) {
    const { MedicalRecord } = await import('../records/record.model.js');
    const record = await MedicalRecord.findOne({ _id: medicalRecordId, patientId });
    if (!record) {
      throw new ApiError(400, 'Medical record does not belong to the specified patient');
    }
  }

  const prescription = await Prescription.create({
    patientId,
    doctorId,
    medicalRecordId,
    items,
    notes,
  });
  res.status(201).json({ success: true, data: prescription });
};

export const getPrescriptionsByPatient = async (req: Request, res: Response) => {
  const { patientId } = req.params;

  // Authorization: user must be the patient themselves, or a doctor/admin
  const isOwner =
    req.user.id === patientId || req.user.role === ROLES.ADMIN || req.user.role === ROLES.DOCTOR;
  if (!isOwner) {
    throw new ApiError(403, "You are not authorized to view this patient's prescriptions");
  }

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
    .populate('items.medicineId', 'name price stockQuantity');
  if (!prescription) throw new ApiError(404, 'Prescription not found');

  // Authorization: user must be the patient, the prescribing doctor, or an admin
  const patientIdStr =
    typeof prescription.patientId === 'object' && prescription.patientId._id
      ? prescription.patientId._id.toString()
      : prescription.patientId.toString();
  const doctorIdStr =
    typeof prescription.doctorId === 'object' && prescription.doctorId._id
      ? prescription.doctorId._id.toString()
      : prescription.doctorId.toString();
  const isAuthorized =
    req.user.id === patientIdStr ||
    req.user.id === doctorIdStr ||
    req.user.role === ROLES.ADMIN ||
    req.user.role === ROLES.PHARMACIST;
  if (!isAuthorized) {
    throw new ApiError(403, 'You are not authorized to view this prescription');
  }

  res.json({ success: true, data: prescription });
};

export const getPendingPrescriptions = async (req: Request, res: Response) => {
  const skip = Math.max(0, Number(req.query.skip) || 0);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const [prescriptions, total] = await Promise.all([
    Prescription.find({ status: PRESCRIPTION_STATUS.ACTIVE })
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'userId.name specialization')
      .populate('items.medicineId', 'name price stockQuantity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Prescription.countDocuments({ status: PRESCRIPTION_STATUS.ACTIVE }),
  ]);

  res.json({ success: true, data: { prescriptions, total, skip, limit } });
};

export const getPrescriptionsByMedicalRecord = async (req: Request, res: Response) => {
  const { medicalRecordId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(medicalRecordId)) {
    throw new ApiError(400, 'Invalid medical record ID');
  }

  const prescriptions = await Prescription.find({ medicalRecordId })
    .populate('doctorId', 'specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: prescriptions });
};

export const cancelPrescription = async (req: Request, res: Response) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) throw new ApiError(404, 'Prescription not found');

  if (prescription.status !== PRESCRIPTION_STATUS.ACTIVE) {
    throw new ApiError(400, `Cannot cancel a prescription with status '${prescription.status}'`);
  }

  // Ownership check: only admin or the prescribing doctor can cancel
  const isAdmin = req.user.role === ROLES.ADMIN;
  const doctorProfile = await findDoctorByUserId(req.user.id);
  const isPrescribingDoctor =
    doctorProfile && prescription.doctorId.toString() === doctorProfile._id.toString();
  if (!isAdmin && !isPrescribingDoctor) {
    throw new ApiError(403, 'You are not authorized to cancel this prescription');
  }

  prescription.status = PRESCRIPTION_STATUS.CANCELLED;
  await prescription.save();

  res.json({ success: true, data: prescription });
};
