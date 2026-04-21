import { body, param } from 'express-validator';
import { APPOINTMENT_STATUS } from '../../shared/constants/appointmentStatus.js';

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
    .isIn([
      APPOINTMENT_STATUS.PENDING,
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.CANCELLED,
    ])
    .withMessage('Status must be: Pending, Confirmed, Completed, or Cancelled'),
];
