import { body } from 'express-validator';

export const createMedicineValidation = [
  body('name').trim().notEmpty().withMessage('Medicine name is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('stockQuantity').isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('expiryDate')
    .custom((value: string) => {
      const t = new Date(value).getTime();
      if (Number.isNaN(t)) throw new Error('Expiry date must be a valid date');
      if (new Date(value) <= new Date()) throw new Error('Expiry date must be in the future');
      return true;
    }),
];

export const updateMedicineValidation = [
  body('name').optional().trim().notEmpty().withMessage('Medicine name cannot be empty'),
  body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('expiryDate')
    .optional()
    .custom((value: string) => {
      const t = new Date(value).getTime();
      if (Number.isNaN(t)) throw new Error('Expiry date must be a valid date');
      if (new Date(value) <= new Date()) throw new Error('Expiry date must be in the future');
      return true;
    }),
];

export const adjustStockValidation = [
  body('quantityChange')
    .isInt({ min: -1000000, max: 1000000 })
    .withMessage('quantityChange must be a valid integer')
    .custom((value: string | number) => Number(value) !== 0)
    .withMessage('quantityChange must not be zero'),
];
