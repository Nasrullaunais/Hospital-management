import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { Prescription } from './prescription.model.js';
import { MedicalRecord } from '../records/record.model.js';
import { findDoctorByUserId } from '../../shared/utils/doctorLookup.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import { PRESCRIPTION_STATUS } from '../../shared/constants/prescriptionStatus.js';
import { ROLES } from '../../shared/constants/roles.js';
import { parsePagination, buildPaginatedResponse } from '../../shared/types/pagination.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const createPrescription = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { patientId, medicalRecordId, items, notes } = req.body;

  if (!patientId || !items?.length) {
    return next(new ApiError(400, 'patientId and items are required'));
  }

  if (medicalRecordId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(medicalRecordId)) {
      return next(new ApiError(400, 'medicalRecordId must be a valid ObjectId'));
    }
  }

  // Use req.user.id from JWT as the actual doctorId - prevents prescription forgery
  // doctorId in Prescription model references Doctor document (_id), not User id
  const userId = req.user?.id;
  if (!userId) {
    return next(ApiError.unauthorized());
  }
  const doctorProfile = await findDoctorByUserId(userId);
  if (!doctorProfile) {
    return next(new ApiError(403, 'Doctor profile not found for current user'));
  }
  const doctorId = doctorProfile._id;

  // Validate each item has required fields
  for (const item of items) {
    if (!item.medicineId || !item.dosage || !item.quantity || item.quantity <= 0) {
      return next(new ApiError(400, 'Each item must have medicineId, dosage, and quantity > 0'));
    }
    if (item.dosage && typeof item.dosage === 'string' && item.dosage.trim().length === 0) {
      return next(new ApiError(400, 'Each item must have a non-empty dosage'));
    }
  }

  // If medicalRecordId is provided, verify it belongs to the specified patient
  if (medicalRecordId !== undefined) {
    const record = await MedicalRecord.findOne({ _id: medicalRecordId, patientId });
    if (!record) {
      return next(new ApiError(400, 'Medical record does not belong to the specified patient'));
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
});

export const getPrescriptionsByPatient = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { patientId } = req.params;

  // Validate patientId is a valid MongoDB ObjectId (not a JWT token or other invalid value)
  if (!mongoose.Types.ObjectId.isValid(patientId as string)) {
    return next(ApiError.badRequest('Invalid patient ID'));
  }

  // Authorization: user must be the patient themselves, or a doctor/admin
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) {
    return next(new ApiError(401, 'Authentication required'));
  }
  const isOwner =
    userId === patientId || userRole === ROLES.ADMIN || userRole === ROLES.DOCTOR;
  if (!isOwner) {
    return next(new ApiError(403, "You are not authorized to view this patient's prescriptions"));
  }

  const { page, limit, skip } = parsePagination(req.query);

  const [prescriptions, total] = await Promise.all([
    Prescription.find({ patientId })
      .populate('doctorId', 'specialization')
      .populate('items.medicineId', 'name price stockQuantity')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Prescription.countDocuments({ patientId }),
  ]);

  const paginatedData = buildPaginatedResponse(prescriptions, total, page, limit);
  res.json({ success: true, data: paginatedData });
});

export const getPrescriptionById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(ApiError.badRequest('Invalid prescription ID format'));
  }

  const prescription = await Prescription.findById(req.params.id)
    .populate('doctorId', 'userId.name specialization')
    .populate('patientId', 'name email')
    .populate('items.medicineId', 'name price stockQuantity');
  if (!prescription) return next(new ApiError(404, 'Prescription not found'));

  // Authorization: user must be the patient, the prescribing doctor, or an admin
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId || !userRole) {
    return next(ApiError.unauthorized());
  }
  const patientIdStr =
    typeof prescription.patientId === 'object' && prescription.patientId._id
      ? prescription.patientId._id.toString()
      : prescription.patientId.toString();
  const doctorIdStr =
    typeof prescription.doctorId === 'object' && prescription.doctorId._id
      ? prescription.doctorId._id.toString()
      : prescription.doctorId.toString();
  const isAuthorized =
    userId === patientIdStr ||
    userId === doctorIdStr ||
    userRole === ROLES.ADMIN ||
    userRole === ROLES.PHARMACIST;
  if (!isAuthorized) {
    return next(new ApiError(403, 'You are not authorized to view this prescription'));
  }

  res.json({ success: true, data: prescription });
});

export const getPendingPrescriptions = asyncHandler(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
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
});

export const getPrescriptionsByMedicalRecord = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const medicalRecordId = String(req.params.medicalRecordId);

  if (!mongoose.Types.ObjectId.isValid(medicalRecordId)) {
    return next(new ApiError(400, 'Invalid medical record ID'));
  }

  const prescriptions = await Prescription.find({ medicalRecordId })
    .populate('doctorId', 'specialization')
    .populate('items.medicineId', 'name price stockQuantity')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: prescriptions });
});

export const cancelPrescription = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) return next(new ApiError(404, 'Prescription not found'));

  if (prescription.status !== PRESCRIPTION_STATUS.ACTIVE) {
    return next(new ApiError(400, `Cannot cancel a prescription with status '${prescription.status}'`));
  }

  // Ownership check: only admin or the prescribing doctor can cancel
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId || !userRole) {
    return next(ApiError.unauthorized());
  }
  const isAdmin = userRole === ROLES.ADMIN;
  const doctorProfile = await findDoctorByUserId(userId);
  const isPrescribingDoctor =
    doctorProfile && prescription.doctorId.toString() === doctorProfile._id.toString();
  if (!isAdmin && !isPrescribingDoctor) {
    return next(new ApiError(403, 'You are not authorized to cancel this prescription'));
  }

  prescription.status = PRESCRIPTION_STATUS.CANCELLED;
  await prescription.save();

  res.json({ success: true, data: prescription });
});