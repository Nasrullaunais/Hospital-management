import mongoose from 'mongoose';
import type { Request } from 'express';
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
    .withMessage('Expected discharge must be a valid ISO 8601 date')
    .custom((value: string, { req }: { req: Request }) => {
      if (!value) return true;
      const discharge = new Date(value);
      const admission = new Date(req.body.admissionDate);
      if (discharge <= admission) {
        throw new Error('Expected discharge date must be after admission date');
      }
      return true;
    }),
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
    .isIn(['active', 'discharged', 'transferred'])
    .withMessage('Status must be either active, discharged, or transferred'),
];

export const wardIdParamValidation = [
  param('wardId')
    .isMongoId()
    .withMessage('Invalid ward ID'),
];

export const patientIdParamValidation = [
  param('patientId')
    .isMongoId()
    .withMessage('Invalid patient ID'),
];

export const wardIdQueryValidation = [
  query('wardId')
    .optional()
    .custom((value: string) => {
      if (value === '') throw new Error('Ward ID cannot be empty');
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ward ID');
      }
      return true;
    }),
];
