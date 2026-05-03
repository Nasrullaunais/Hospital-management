import type { Request, Response, NextFunction } from 'express';
import { WardMedication, type IWardMedication } from './wardMedication.model.js';
import { WardAssignment } from '../wardAssignments/wardAssignment.model.js';
import { ApiError } from '../../shared/utils/ApiError.js';
import mongoose from 'mongoose';

interface MaskedMedication {
  _id: mongoose.Types.ObjectId;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued';
  notes?: string;
}

const maskMedication = (doc: IWardMedication & { medicationId?: { name: string } }): MaskedMedication => {
  const medicationName = doc.medicationId?.name ?? '';
  if (!medicationName) {
    console.warn(`[wardMedications] Data integrity warning: Medication document ${doc._id} has missing medicationId.name`);
  }
  return {
    _id: doc._id,
    medicationName,
    dosage: doc.dosage,
    frequency: doc.frequency,
    startDate: doc.startDate,
    endDate: doc.endDate,
    status: doc.status,
    notes: doc.notes,
  };
};

export const getPatientMedications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { patientId } = req.params;

    const medications = await WardMedication.aggregate([
      { $match: { wardAssignmentId: new mongoose.Types.ObjectId(patientId) } },
      {
        $lookup: {
          from: 'wardassignments',
          localField: 'wardAssignmentId',
          foreignField: '_id',
          as: 'assignment',
        },
      },
      { $unwind: '$assignment' },
      { $match: { 'assignment.patientId': new mongoose.Types.ObjectId(patientId), 'assignment.status': 'active' } },
      {
        $lookup: {
          from: 'medicines',
          localField: 'medicationId',
          foreignField: '_id',
          as: 'medicationId',
        },
      },
      { $unwind: '$medicationId' },
      {
        $project: {
          _id: 1,
          medicationName: '$medicationId.name',
          dosage: 1,
          frequency: 1,
          startDate: 1,
          endDate: 1,
          status: 1,
          notes: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: { medications },
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(ApiError.badRequest('Invalid medication ID format'));
    }

    const medication = await WardMedication.findById(id).populate<{
      medicationId: { name: string };
    }>('medicationId', 'name');

    if (!medication) {
      return next(ApiError.notFound('Medication not found'));
    }

    const activeAssignment = await WardAssignment.findOne({
      _id: medication.wardAssignmentId,
      status: 'active',
    });

    if (!activeAssignment) {
      return next(ApiError.notFound('Medication not found'));
    }

    const masked = maskMedication(medication);

    res.status(200).json({
      success: true,
      data: masked,
    });
  } catch (error) {
    next(error);
  }
};

export const addWardMedication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { wardAssignmentId, medicationId, dosage, frequency, route, startDate, endDate, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(wardAssignmentId)) {
      return next(ApiError.badRequest('Invalid ward assignment ID format'));
    }
    if (!mongoose.Types.ObjectId.isValid(medicationId)) {
      return next(ApiError.badRequest('Invalid medication ID format'));
    }

    const assignment = await WardAssignment.findOne({
      _id: wardAssignmentId,
      status: 'active',
    });

    if (!assignment) {
      return next(ApiError.notFound('Active ward assignment not found'));
    }

    const medication = await WardMedication.create({
      wardAssignmentId,
      medicationId,
      dosage,
      frequency,
      route,
      startDate,
      endDate,
      notes,
    });

    const populated = await medication.populate<{ medicationId: { name: string } }>('medicationId', 'name');

    res.status(201).json({
      success: true,
      data: maskMedication(populated),
    });
  } catch (error) {
    next(error);
  }
};

export const updateWardMedication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { dosage, frequency, route, endDate, status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(ApiError.badRequest('Invalid medication ID format'));
    }

    const medication = await WardMedication.findById(id);

    if (!medication) {
      return next(ApiError.notFound('Medication not found'));
    }

    const activeAssignment = await WardAssignment.findOne({
      _id: medication.wardAssignmentId,
      status: 'active',
    });

    if (!activeAssignment) {
      return next(ApiError.notFound('Medication not found'));
    }

    const updated = await WardMedication.findByIdAndUpdate(
      id,
      { dosage, frequency, route, endDate, status, notes },
      { returnDocument: 'after', runValidators: true },
    ).populate<{ medicationId: { name: string } }>('medicationId', 'name');

    res.status(200).json({
      success: true,
      data: maskMedication(updated!),
    });
  } catch (error) {
    next(error);
  }
};

export const discontinueMedication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(ApiError.badRequest('Invalid medication ID format'));
    }

    const medication = await WardMedication.findById(id);

    if (!medication) {
      return next(ApiError.notFound('Medication not found'));
    }

    const activeAssignment = await WardAssignment.findOne({
      _id: medication.wardAssignmentId,
      status: 'active',
    });

    if (!activeAssignment) {
      return next(ApiError.notFound('Medication not found'));
    }

    const discontinued = await WardMedication.findByIdAndUpdate(
      id,
      { status: 'discontinued', endDate: new Date() },
      { returnDocument: 'after' },
    ).populate<{ medicationId: { name: string } }>('medicationId', 'name');

    res.status(200).json({
      success: true,
      data: maskMedication(discontinued!),
    });
  } catch (error) {
    next(error);
  }
};