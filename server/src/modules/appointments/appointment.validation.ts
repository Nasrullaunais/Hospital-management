import { body, param } from 'express-validator';

export const bookAppointmentValidation = [
  body('doctorId').isMongoId().withMessage('A valid doctorId is required'),
  body('appointmentDate')
    .isISO8601()
    .withMessage('Appointment date must be a valid date (ISO 8601)')
    .custom((value: string) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Appointment date must be in the future');
      }
      return true;
    }),
  body('reasonForVisit')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
];

export const updateStatusValidation = [
  param('id').isMongoId().withMessage('Invalid appointment ID'),
  body('status')
    .isIn(['Pending', 'Confirmed', 'Completed', 'Cancelled'])
    .withMessage('Status must be: Pending, Confirmed, Completed, or Cancelled'),
];
