import { type Request, type Response } from 'express';
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
    .populate('items.medicineId');
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
  const prescriptions = await Prescription.find({ status: PRESCRIPTION_STATUS.ACTIVE })
    .populate('patientId', 'name email phone')
    .populate('doctorId', 'userId.name specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: prescriptions });
};

export const cancelPrescription = async (req: Request, res: Response) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) throw new ApiError(404, 'Prescription not found');

  // Status guard: can only cancel active prescriptions
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
