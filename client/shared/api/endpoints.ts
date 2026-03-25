/**
 * Centralized API endpoint constants.
 * All members should import endpoints from here — never hardcode strings.
 *
 * Usage:
 *   import { ENDPOINTS } from '@/shared/api/endpoints';
 *   await apiClient.post(ENDPOINTS.AUTH.LOGIN, { email, password });
 */
export const ENDPOINTS = {
  // Member 1 — Auth & Patients
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
  },
  PATIENTS: {
    ME: '/patients/me',
  },

  // Member 2 — Doctors
  DOCTORS: {
    BASE: '/doctors',
    BY_ID: (id: string) => `/doctors/${id}`,
  },

  // Member 3 — Appointments
  APPOINTMENTS: {
    BASE: '/appointments',
    MY_APPOINTMENTS: '/appointments/my-appointments',
    DOCTOR_SCHEDULE: (doctorId: string) => `/appointments/doctor/${doctorId}`,
    UPDATE_STATUS: (id: string) => `/appointments/${id}/status`,
    CANCEL: (id: string) => `/appointments/${id}`,
  },

  // Member 4 — Medical Records
  RECORDS: {
    BASE: '/records',
    BY_PATIENT: (patientId: string) => `/records/patient/${patientId}`,
    BY_ID: (id: string) => `/records/${id}`,
  },

  // Member 5 — Pharmacy
  MEDICINES: {
    BASE: '/medicines',
    BY_ID: (id: string) => `/medicines/${id}`,
  },

  // Member 6 — Billing
  INVOICES: {
    BASE: '/invoices',
    MY_BILLS: '/invoices/my-bills',
    PAY: (id: string) => `/invoices/${id}/pay`,
    VERIFY: (id: string) => `/invoices/${id}/verify`,
  },
} as const;
