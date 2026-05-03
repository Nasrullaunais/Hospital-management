import { body } from 'express-validator';

export const upsertScheduleValidation = [
  body('doctorId')
    .isMongoId()
    .withMessage('A valid doctorId (MongoDB ObjectId) is required'),

  body('weeklySlots')
    .isArray({ min: 1 })
    .withMessage('weeklySlots must be a non-empty array'),

  body('weeklySlots.*.dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('dayOfWeek must be 0 (Sunday) to 6 (Saturday)'),

  body('weeklySlots.*.startTime')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('startTime must be in HH:mm format')
    .custom(
      (value: string, { req, path }) => {
        // Validate that startTime < endTime for this slot
        const idx = Number(path.match(/\[(\d+)\]/)?.[1]);
        if (idx === undefined) return true;
        const endTime = req.body?.weeklySlots?.[idx]?.endTime;
        if (endTime && value >= endTime) {
          throw new Error('startTime must be before endTime');
        }
        return true;
      },
    ),

  body('weeklySlots.*.endTime')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('endTime must be in HH:mm format'),

  body('weeklySlots.*.isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('slotDuration')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('slotDuration must be between 10 and 120 minutes'),

  body('exceptions')
    .optional()
    .isArray()
    .withMessage('exceptions must be an array'),

  body('exceptions.*.date')
    .optional()
    .isISO8601()
    .withMessage('exception date must be a valid date'),

  body('exceptions.*.isAvailable')
    .optional()
    .isBoolean()
    .withMessage('exception isAvailable must be a boolean'),

  body('exceptions.*.reason')
    .optional()
    .trim(),
];
