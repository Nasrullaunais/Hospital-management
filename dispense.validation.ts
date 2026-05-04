import { body } from 'express-validator';

export const dispensePrescriptionValidation = [
  body('prescriptionId').isMongoId().withMessage('A valid prescriptionId is required'),
  body('dispensedItems')
    .isArray({ min: 1 })
    .withMessage('At least one dispensed item is required'),
  body('dispensedItems.*.medicineId')
    .isMongoId()
    .withMessage('Each dispensed item must have a valid medicineId'),
  body('dispensedItems.*.quantityDispensed')
    .isInt({ min: 1 })
    .withMessage('Each dispensed item must have a quantityDispensed of at least 1'),
  body('dispensedItems.*.medicineName')
    .optional()
    .isString()
    .trim(),
];
