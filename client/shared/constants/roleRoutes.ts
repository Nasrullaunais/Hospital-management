import type { UserRole } from '@/shared/types';

export const ROLE_HOME_ROUTES: Record<UserRole, '/(patient)' | '/(doctor)' | '/(pharmacist)' | '/(admin)'> = {
  patient: '/(patient)',
  doctor: '/(doctor)',
  pharmacist: '/(pharmacist)',
  admin: '/(admin)',
};

export function getRoleHomeRoute(role?: UserRole | null): '/(patient)' | '/(doctor)' | '/(pharmacist)' | '/(admin)' | null {
  if (!role) return null;
  return ROLE_HOME_ROUTES[role] ?? null;
}
