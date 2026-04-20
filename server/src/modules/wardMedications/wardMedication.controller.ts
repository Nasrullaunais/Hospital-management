import type { Request, Response, NextFunction } from 'express';
import { WardMedication, IWardMedication } from './wardMedication.model.js';
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

const maskMedication = (doc: IWardMedication & { medicationId?: { name: string } }): MaskedMedication => ({
  _id: doc._id,
  medicationName: doc.medicationId?.name ?? '',
  dosage: doc.dosage,
  frequency: doc.frequency,
  startDate: doc.startDate,
  endDate: doc.endDate,
  status: doc.status,
  notes: doc.notes,
});

export const getPatientMedications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { patientId } = req.params;

    const activeAssignment = await WardAssignment.findOne({
      patientId: new mongoose.Types.ObjectId(patientId),
      status: 'active',
    });

    if (!activeAssignment) {
      throw ApiError.notFound('Patient is not currently assigned to any ward');
    }

    const medications = await WardMedication.find({
      wardAssignmentId: activeAssignment._id,
    }).populate<{ medicationId: { name: string } }>('medicationId', 'name');

    const masked = medications.map(m => maskMedication(m));

    res.status(200).json({
      success: true,
      data: { medications: masked },
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
      throw ApiError.badRequest('Invalid medication ID format');
    }

    const medication = await WardMedication.findById(id).populate<{
      medicationId: { name: string };
    }>('medicationId', 'name');

    if (!medication) {
      throw ApiError.notFound('Medication not found');
    }

    const activeAssignment = await WardAssignment.findOne({
      _id: medication.wardAssignmentId,
      status: 'active',
    });

    if (!activeAssignment) {
      throw ApiError.notFound('Medication not found');
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
