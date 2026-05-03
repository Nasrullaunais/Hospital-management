import { body } from 'express-validator';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const generateUploadUrlValidation = [
  body('fileName')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('fileName is required'),
  body('mimeType')
    .isString()
    .isIn(ALLOWED_MIME_TYPES)
    .withMessage(`mimeType must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`),
  body('module')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('module is required'),
  body('expirySeconds')
    .optional()
    .isInt({ min: 1 })
    .withMessage('expirySeconds must be a positive integer'),
];
