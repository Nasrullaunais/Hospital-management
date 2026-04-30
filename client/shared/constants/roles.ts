/**
 * Centralized role constants for the client.
 * Use ROLES instead of hardcoded strings like 'doctor', 'admin', etc.
 *
 * Usage:
 *   import { ROLES } from '@/shared/constants/roles';
 *   if (user.role === ROLES.ADMIN) { ... }
 */
export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
  PHARMACIST: 'pharmacist',
  RECEPTIONIST: 'receptionist',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * All valid user roles.
 */
export const ALL_ROLES: Role[] = [
  ROLES.PATIENT,
  ROLES.DOCTOR,
  ROLES.ADMIN,
  ROLES.PHARMACIST,
  ROLES.RECEPTIONIST,
];
