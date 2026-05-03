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
    LOGOUT: '/auth/logout',
  },
  PATIENTS: {
    ME: '/patients/me',
    SEARCH: '/patients/search',
  },

  // Member 2 — Doctors
  DOCTORS: {
    BASE: '/doctors',
    ME: '/doctors/me',
    BY_ID: (id: string) => `/doctors/${id}`,
    SPECIALIZATIONS: '/doctors/specializations',
    SCHEDULE: '/doctors/schedule',
    SCHEDULE_BY_DOCTOR: (id: string) => `/doctors/${id}/schedule`,
    AVAILABLE_SLOTS: (id: string, date: string) => `/doctors/${id}/available-slots?date=${date}`,
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

  // Member 4 — Lab Reports & Report Generation
  LAB_REPORTS: {
    BASE: '/lab-reports',
    BY_PATIENT: (patientId: string) => `/lab-reports/patient/${patientId}`,
    BY_ID: (id: string) => `/lab-reports/${id}`,
    REVIEW: (id: string) => `/lab-reports/${id}/review`,
  },

  REPORTS: {
    LAB_REPORT: '/reports/lab-report',
    PRESCRIPTION: '/reports/prescription',
    MEDICAL_CERTIFICATE: '/reports/medical-certificate',
  },

  // Member 5 — Pharmacy
  MEDICINES: {
    BASE: '/medicines',
    BY_ID: (id: string) => `/medicines/${id}`,
    BATCH: '/medicines/batch',
    ADJUST_STOCK: (id: string) => `/medicines/${id}/stock`,
  },

  // Member 6 — Billing
  INVOICES: {
    BASE: '/invoices',
    STATS: '/invoices/stats',
    MY_BILLS: '/invoices/my-bills',
    BY_ID: (id: string) => `/invoices/${id}`,
    UPLOAD_RECEIPT: (id: string) => `/invoices/${id}/upload-receipt`,
    VERIFY: (id: string) => `/invoices/${id}/verify`,
    PENDING_PATIENTS: '/invoices/pending-patients',
    SUGGESTIONS: (patientId: string, appointmentId?: string) => {
      const base = `/invoices/suggestions/${patientId}`;
      return appointmentId ? `${base}?appointmentId=${appointmentId}` : base;
    },
  },
  PAYMENTS: {
    BASE: '/payments',
    BY_INVOICE: (id: string) => `/payments/invoice/${id}`,
    BY_ID: (id: string) => `/payments/${id}`,
    PROCESS: (id: string) => `/payments/${id}/process`,
  },

  // Member 7 — Prescriptions
  PRESCRIPTIONS: {
    BASE: '/prescriptions',
    PENDING: '/prescriptions/pending',
    BY_PATIENT: (patientId: string) => `/prescriptions/patient/${patientId}`,
    BY_ID: (id: string) => `/prescriptions/${id}`,
    BY_RECORD: (recordId: string) => `/prescriptions/record/${recordId}`,
  },

  // Admin — Staff Management
  ADMIN: {
    USERS: '/admin/users',
    USER_BY_ID: (id: string) => `/admin/users/${id}`,
  },

  // Member 8 — Dispensing
  DISPENSE: {
    BASE: '/dispense',
    BY_PATIENT: (patientId: string) => `/dispense/patient/${patientId}`,
  },

  // Wards
  WARDS: {
    BASE: '/wards',
    BY_ID: (id: string) => `/wards/${id}`,
    UPDATE_BEDS: (id: string) => `/wards/${id}/beds`,
  },

  WARD_RECEPTIONIST: {
    STATS: '/assignments/stats',
    BED_STATUSES: '/assignments/bed-statuses',
    ASSIGNMENTS_BASE: '/assignments',
    ASSIGNMENTS: (wardId: string) => `/assignments/ward/${wardId}`,
    UNASSIGN: (assignmentId: string) => `/assignments/${assignmentId}`,
    PATIENT_MEDICATIONS: (patientId: string) => `/wardMedications/patient/${patientId}`,
    PATIENTS: (wardId: string) => `/assignments/ward/${wardId}/patients`,
    PATIENT_BY_ID: (patientId: string) => `/assignments/patient/${patientId}`,
    ALL_PATIENTS: '/assignments/patients',
  },
} as const;
