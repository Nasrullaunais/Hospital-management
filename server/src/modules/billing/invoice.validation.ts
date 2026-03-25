import { body } from 'express-validator';

export const createInvoiceValidation = [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('appointmentId').optional().isMongoId().withMessage('appointmentId must be a valid ObjectId'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a non-negative number'),
];

export const verifyPaymentValidation = [
  body('paymentStatus')
    .equals('Paid')
    .withMessage('paymentStatus must be "Paid" to verify a payment'),
];
