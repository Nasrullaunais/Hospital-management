import { body, param, query } from 'express-validator';

export const createWardValidation = [
  body('departmentId')
    .isMongoId()
    .withMessage('Department ID must be a valid MongoDB ObjectId'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Ward name is required')
    .isLength({ max: 100 })
    .withMessage('Ward name cannot exceed 100 characters'),
  body('type')
    .isIn(['general', 'private', 'icu', 'emergency'])
    .withMessage('Type must be: general, private, icu, or emergency'),
  body('totalBeds')
    .isInt({ min: 1 })
    .withMessage('Total beds must be a positive integer'),
  body('currentOccupancy')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current occupancy must be a non-negative integer'),
];

export const updateWardValidation = [
  body('departmentId')
    .optional()
    .isMongoId()
    .withMessage('Department ID must be a valid MongoDB ObjectId'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Ward name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Ward name cannot exceed 100 characters'),
  body('type')
    .optional()
    .isIn(['general', 'private', 'icu', 'emergency'])
    .withMessage('Type must be: general, private, icu, or emergency'),
  body('totalBeds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Total beds must be a positive integer'),
  body('currentOccupancy')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current occupancy must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['available', 'full', 'maintenance'])
    .withMessage('Status must be: available, full, or maintenance'),
];

export const updateBedsValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ward ID'),
  body('currentOccupancy')
    .isInt({ min: 0 })
    .withMessage('Current occupancy must be a non-negative integer'),
];

export const wardIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ward ID'),
];

export const listWardsValidation = [
  query('departmentId').optional().isMongoId(),
  query('type').optional().isIn(['general', 'private', 'icu', 'emergency']),
  query('status').optional().isIn(['available', 'full', 'maintenance']),
];
