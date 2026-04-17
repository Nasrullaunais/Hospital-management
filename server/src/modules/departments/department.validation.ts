import { body, param, query } from 'express-validator';

export const createDepartmentValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('headDoctorId')
    .optional()
    .isMongoId()
    .withMessage('Head doctor ID must be a valid MongoDB ObjectId'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
];

export const updateDepartmentValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('headDoctorId')
    .optional()
    .isMongoId()
    .withMessage('Head doctor ID must be a valid MongoDB ObjectId'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),
];

export const departmentIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid department ID'),
];

export const listDepartmentsValidation = [
  query('status').optional().isIn(['active', 'inactive']),
];
