import { body, query } from 'express-validator';

export const createDoctorValidation = [
  body('userId').isMongoId().withMessage('A valid userId (MongoDB ObjectId) is required'),
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
    .isIn(['Available', 'Unavailable', 'On Leave'])
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
  query('availability').optional().isIn(['Available', 'Unavailable', 'On Leave']),
];
