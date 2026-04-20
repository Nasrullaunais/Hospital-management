import { body, param, query } from 'express-validator';

export const assignPatientValidation = [
  body('wardId')
    .isMongoId()
    .withMessage('A valid wardId is required'),
  body('bedNumber')
    .isInt({ min: 1 })
    .withMessage('Bed number must be a positive integer'),
  body('patientId')
    .isMongoId()
    .withMessage('A valid patientId is required'),
  body('admissionDate')
    .isISO8601()
    .withMessage('Admission date must be a valid ISO 8601 date'),
  body('expectedDischarge')
    .optional()
    .isISO8601()
    .withMessage('Expected discharge must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

export const assignmentIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid assignment ID'),
];

export const updateAssignmentValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid assignment ID'),
  body('expectedDischarge')
    .optional()
    .isISO8601()
    .withMessage('Expected discharge must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'discharged'])
    .withMessage('Status must be either active or discharged'),
];

export const wardIdParamValidation = [
  param('wardId')
    .isMongoId()
    .withMessage('Invalid ward ID'),
];

export const wardIdQueryValidation = [
  query('wardId')
    .optional()
    .isMongoId()
    .withMessage('Invalid ward ID'),
];
