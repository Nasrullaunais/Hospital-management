import { body } from 'express-validator';
import mongoose from 'mongoose';

const objectIdValidation = (value: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

export const getPatientMedicationsValidation = [
  body('patientId')
    .trim()
    .notEmpty()
    .withMessage('Patient ID is required')
    .custom(objectIdValidation),
];

export const getMedicationByIdValidation = [
  body('id')
    .trim()
    .notEmpty()
    .withMessage('Medication ID is required')
    .custom(objectIdValidation),
];
