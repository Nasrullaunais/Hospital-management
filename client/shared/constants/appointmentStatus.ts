import { AppointmentStatus } from '@/shared/types';

export const APPOINTMENT_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const APPOINTMENT_STATUS_VARIANTS: Record<AppointmentStatus, 'warning' | 'info' | 'success' | 'error'> = {
  Pending: 'warning',
  Confirmed: 'info',
  Completed: 'success',
  Cancelled: 'error',
};

export type AppointmentStatusValue = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

export const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  APPOINTMENT_STATUS.PENDING,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.CANCELLED,
];