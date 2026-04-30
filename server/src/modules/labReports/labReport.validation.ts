import { body } from 'express-validator';

const labTypes = [
  'hematology',
  'biochemistry',
  'microbiology',
  'urinalysis',
  'radiology',
  'serology',
  'pathology',
  'other',
] as const;

const flags = ['normal', 'high', 'low', 'critical'] as const;

export const createLabReportValidation = [
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
  body('labType').isIn(labTypes).withMessage('Valid lab type is required'),
  body('testDate').optional().isISO8601().withMessage('Valid test date is required'),
  body('medicalRecordId')
    .optional({ values: 'null' })
    .isMongoId()
    .withMessage('Valid medicalRecordId is required'),
  body('appointmentId')
    .optional({ values: 'null' })
    .isMongoId()
    .withMessage('Valid appointmentId is required'),
  body('results').isArray({ min: 1 }).withMessage('At least one result is required'),
  body('results.*.parameter').trim().notEmpty().withMessage('Parameter name is required'),
  body('results.*.value').isNumeric().withMessage('Result value must be numeric'),
  body('results.*.unit').trim().notEmpty().withMessage('Unit is required'),
  body('results.*.normalRange').optional().trim(),
  body('results.*.flag')
    .optional()
    .isIn(flags)
    .withMessage('Flag must be one of: normal, high, low, critical'),
  body('interpretation').optional().trim(),
  body('notes').optional().trim(),
];

export const updateLabReportValidation = [
  body('patientId').optional().isMongoId().withMessage('A valid patientId is required'),
  body('labType')
    .optional()
    .isIn(labTypes)
    .withMessage('Valid lab type is required'),
  body('status')
    .optional()
    .isIn(['pending', 'sample_collected', 'in_progress', 'completed', 'reviewed'])
    .withMessage('Valid status is required'),
  body('testDate').optional().isISO8601().withMessage('Valid test date is required'),
  body('medicalRecordId')
    .optional({ values: 'null' })
    .isMongoId()
    .withMessage('Valid medicalRecordId is required'),
  body('appointmentId')
    .optional({ values: 'null' })
    .isMongoId()
    .withMessage('Valid appointmentId is required'),
  body('results')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one result is required'),
  body('results.*.parameter').optional().trim().notEmpty().withMessage('Parameter name is required'),
  body('results.*.value').optional().isNumeric().withMessage('Result value must be numeric'),
  body('results.*.unit').optional().trim().notEmpty().withMessage('Unit is required'),
  body('results.*.normalRange').optional().trim(),
  body('results.*.flag')
    .optional()
    .isIn(flags)
    .withMessage('Flag must be one of: normal, high, low, critical'),
  body('interpretation').optional().trim(),
  body('notes').optional().trim(),
];
