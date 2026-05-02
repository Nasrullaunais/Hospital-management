import { body } from 'express-validator';

export const createInvoiceValidation = [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('appointmentId').optional().isMongoId().withMessage('appointmentId must be a valid ObjectId'),

  // Line items validation
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one invoice item is required'),
  body('items.*.description')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 200 })
    .withMessage('Each item must have a description (max 200 characters)'),
  body('items.*.category')
    .isIn(['consultation', 'medicine', 'lab_test', 'ward', 'procedure', 'other'])
    .withMessage('Invalid item category'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Item quantity must be an integer between 1 and 1000'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Item unit price must be a non-negative number'),

  // Optional fields
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a non-negative number'),
  body('notes').optional().isString().trim().isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),
];

export const verifyPaymentValidation = [
  body('paymentStatus')
    .equals('Paid')
    .withMessage('paymentStatus must be "Paid" to verify a payment'),
];
