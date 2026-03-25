import { body } from 'express-validator';

export const createRecordValidation = [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('diagnosis').trim().notEmpty().withMessage('Diagnosis is required'),
  body('prescription').optional().trim(),
];

export const updateRecordValidation = [
  body('diagnosis').optional().trim().notEmpty().withMessage('Diagnosis cannot be empty'),
  body('prescription').optional().trim(),
];
