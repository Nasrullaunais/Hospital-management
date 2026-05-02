import { body } from 'express-validator';

export const createPaymentValidation = [
  body('invoiceId').isMongoId().withMessage('A valid invoiceId is required'),
  body('method')
    .isIn(['mock_card', 'bank_transfer'])
    .withMessage('Payment method must be either mock_card or bank_transfer'),
];
