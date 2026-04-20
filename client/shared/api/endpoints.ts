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
    ME: '/doctors/me',
    BY_ID: (id: string) => `/doctors/${id}`,
  },

  // Member 3 — Appointments
  APPOINTMENTS: {
    BASE: '/appointments',
    MY_APPOINTMENTS: '/appointments/my-appointments',
    DOCTOR_SCHEDULE: (doctorId: string) => `/appointments/doctor/${doctorId}`,
    UPDATE_STATUS: (id: string) => `/appointments/${id}/status`,
    CANCEL: (id: string) => `/appointments/${id}`,
    MY_DOCTOR_SCHEDULE: '/appointments/doctor-schedule',
  },

  // Member 4 — Medical Records
  RECORDS: {
    BASE: '/records',
    BY_PATIENT: (patientId: string) => `/records/patient/${patientId}`,
    BY_ID: (id: string) => `/records/${id}`,
    DOCTOR_LOGS: '/records/doctor-logs',
  },

  // Member 5 — Pharmacy
  MEDICINES: {
    BASE: '/medicines',
    BY_ID: (id: string) => `/medicines/${id}`,
    ADJUST_STOCK: (id: string) => `/medicines/${id}/stock`,
  },

  // Member 6 — Billing
  INVOICES: {
    BASE: '/invoices',
    MY_BILLS: '/invoices/my-bills',
    UPLOAD_RECEIPT: (id: string) => `/invoices/${id}/upload-receipt`,
    VERIFY: (id: string) => `/invoices/${id}/verify`,
  },

  // Member 7 — Prescriptions
  PRESCRIPTIONS: {
    BASE: '/prescriptions',
    PENDING: '/prescriptions/pending',
    BY_PATIENT: (patientId: string) => `/prescriptions/patient/${patientId}`,
    BY_ID: (id: string) => `/prescriptions/${id}`,
  },

  // Member 8 — Dispensing
  DISPENSE: {
    BASE: '/dispense',
    BY_PATIENT: (patientId: string) => `/dispense/patient/${patientId}`,
  },

  // Departments & Wards
  DEPARTMENTS: {
    BASE: '/departments',
    BY_ID: (id: string) => `/departments/${id}`,
  },

  WARDS: {
    BASE: '/wards',
    BY_ID: (id: string) => `/wards/${id}`,
    UPDATE_BEDS: (id: string) => `/wards/${id}/beds`,
  },

  WARD_RECEPTIONIST: {
    STATS: '/wardAssignments/stats',
    BED_STATUSES: '/wardAssignments/bed-statuses',
    ASSIGNMENTS_BASE: '/wardAssignments',
    ASSIGNMENTS: (wardId: string) => `/wardAssignments/ward/${wardId}`,
    UNASSIGN: (assignmentId: string) => `/wardAssignments/${assignmentId}`,
    PATIENT_MEDICATIONS: (patientId: string) => `/wardMedications/patient/${patientId}`,
    PATIENTS: (wardId: string) => `/wardAssignments/ward/${wardId}/patients`,
  },
} as const;
