import { body, query } from 'express-validator';

const AVAILABILITIES = ['Available', 'Unavailable', 'On Leave'] as const;

export const createDoctorValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('specialization').trim().notEmpty().withMessage('Specialization is required'),
  body('experienceYears')
    .isInt({ min: 0 })
    .withMessage('Experience years must be a non-negative integer'),
  body('consultationFee')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a non-negative number'),
];

export const updateDoctorValidation = [
  body('availability')
    .optional()
    .isIn(AVAILABILITIES)
    .withMessage('Availability must be: Available, Unavailable, or On Leave'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a non-negative number'),
  body('specialization').optional().trim().notEmpty().withMessage('Specialization cannot be empty'),
  body('experienceYears')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience years must be a non-negative integer'),
];

export const listDoctorsValidation = [
  query('specialization').optional().trim(),
  query('availability').optional().isIn(AVAILABILITIES),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];
