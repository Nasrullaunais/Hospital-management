export const PRESCRIPTION_STATUS = {
  ACTIVE: 'active',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
} as const;

export type PrescriptionStatus = typeof PRESCRIPTION_STATUS[keyof typeof PRESCRIPTION_STATUS];