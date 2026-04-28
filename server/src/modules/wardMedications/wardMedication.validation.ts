import { body, param } from 'express-validator';
import mongoose from 'mongoose';

const objectIdValidation = (value: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

export const addWardMedicationValidation = [
  body('wardAssignmentId')
    .trim()
    .notEmpty().withMessage('Ward assignment ID is required')
    .custom(objectIdValidation),
  body('medicationId')
    .trim()
    .notEmpty().withMessage('Medication ID is required')
    .custom(objectIdValidation),
  body('dosage')
    .trim()
    .notEmpty().withMessage('Dosage is required'),
  body('frequency')
    .trim()
    .notEmpty().withMessage('Frequency is required'),
  body('route')
    .optional()
    .trim(),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  body('notes')
    .optional()
    .trim(),
];

export const updateWardMedicationValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Medication ID is required')
    .custom(objectIdValidation),
  body('dosage')
    .optional()
    .trim()
    .notEmpty().withMessage('Dosage cannot be empty'),
  body('frequency')
    .optional()
    .trim()
    .notEmpty().withMessage('Frequency cannot be empty'),
  body('route')
    .optional()
    .trim(),
  body('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid date'),
  body('status')
    .optional()
    .isIn(['active', 'completed', 'discontinued']).withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim(),
];

export const discontinueMedicationValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Medication ID is required')
    .custom(objectIdValidation),
];

export const getPatientMedicationsValidation = [
  param('patientId').isMongoId().withMessage('Invalid patient ID'),
];

export const getMedicationByIdValidation = [
  param('id').isMongoId().withMessage('Invalid medication ID'),
];
