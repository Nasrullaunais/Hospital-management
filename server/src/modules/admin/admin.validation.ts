import { body, param, query } from 'express-validator';

export const createUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must not exceed 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .isIn(['receptionist', 'pharmacist'])
    .withMessage('Role must be either receptionist or pharmacist'),
];

export const listUsersValidation = [
  query('role')
    .optional()
    .isIn(['receptionist', 'pharmacist'])
    .withMessage('Role filter must be receptionist or pharmacist'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const deleteUserValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
];
