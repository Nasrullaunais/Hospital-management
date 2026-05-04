import { body } from 'express-validator';

export const createPrescriptionValidation = [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('doctorId').isMongoId().withMessage('A valid doctorId is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one prescription item is required'),
  body('items.*.medicineId')
    .isMongoId()
    .withMessage('Each item must have a valid medicineId'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item must have a quantity of at least 1'),
  body('items.*.dosage')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each item must have a dosage'),
  body('items.*.medicineName')
    .optional()
    .isString()
    .trim(),
  body('items.*.instructions')
    .optional()
    .isString()
    .trim(),
  body('notes').optional().isString().trim(),
  body('medicalRecordId').optional().isMongoId().withMessage('medicalRecordId must be a valid ObjectId'),
];
