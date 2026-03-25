import { body } from 'express-validator';

export const createMedicineValidation = [
  body('name').trim().notEmpty().withMessage('Medicine name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('stockQuantity').isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('expiryDate')
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value: string) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }
      return true;
    }),
];

export const updateMedicineValidation = [
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('expiryDate').optional().isISO8601().withMessage('Expiry date must be a valid date'),
];
