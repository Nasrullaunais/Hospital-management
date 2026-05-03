import { body } from 'express-validator';

export const generateReportValidation = [
  body('type')
    .isIn(['lab-report', 'prescription', 'medical-certificate'])
    .withMessage('type must be one of: lab-report, prescription, medical-certificate'),
  body('data').isObject().withMessage('data must be an object'),
  body('reportId').isMongoId().withMessage('A valid reportId is required'),
  body('patientId').isMongoId().withMessage('A valid patientId is required'),
];
