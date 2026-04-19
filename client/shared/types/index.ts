/**
 * Shared TypeScript interfaces & types used across all feature modules.
 * Each member can add their own types here or keep them in their feature folder.
 */

// ── API Response ───────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

// ── User / Auth ────────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor' | 'admin' | 'pharmacist';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  dateOfBirth?: string;
  idDocumentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ── Doctor ─────────────────────────────────────────────────────────────────────

export type DoctorAvailability = 'Available' | 'Unavailable' | 'On Leave';

export interface Doctor {
  _id: string;
  userId: User;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
  availability: DoctorAvailability;
  licenseDocumentUrl: string;
}

// ── Appointment ────────────────────────────────────────────────────────────────

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Appointment {
  _id: string;
  patientId: string | User;
  doctorId: string | Doctor;
  appointmentDate: string;
  reasonForVisit?: string;
  status: AppointmentStatus;
  referralDocumentUrl?: string;
  createdAt: string;
}

// ── Medical Record ─────────────────────────────────────────────────────────────

export interface MedicalRecord {
  _id: string;
  patientId: string | User;
  doctorId: string | Doctor;
  diagnosis: string;
  prescription?: string;
  dateRecorded: string;
  labReportUrl?: string;
  createdAt: string;
}

/** Populated variant returned by GET /api/records/patient/:id and /api/records/doctor-logs */
export interface PopulatedMedicalRecord extends Omit<MedicalRecord, 'patientId' | 'doctorId'> {
  patientId: { _id: string; name: string; email: string };
  doctorId: { _id: string; specialization: string; userId: { _id: string; name: string } };
}

// ── Medicine ───────────────────────────────────────────────────────────────────

export interface Medicine {
  _id: string;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  expiryDate: string;
  packagingImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

// ── Invoice ────────────────────────────────────────────────────────────────────

export type PaymentStatus = 'Unpaid' | 'Pending Verification' | 'Paid';

export interface Invoice {
  _id: string;
  patientId: string | User;
  appointmentId?: string | Appointment;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  issuedDate: string;
  paymentReceiptUrl?: string;
}

// ── Department ─────────────────────────────────────────────────────────────────

export interface Department {
  _id: string;
  name: string;
  description: string;
  headDoctorId?: string | { _id: string; userId: string };
  location: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ── Ward ────────────────────────────────────────────────────────────────────────

export type WardType = 'general' | 'private' | 'icu' | 'emergency';
export type WardStatus = 'available' | 'full' | 'maintenance';

export interface Ward {
  _id: string;
  departmentId: string | { _id: string; name: string; location: string };
  name: string;
  type: WardType;
  totalBeds: number;
  currentOccupancy: number;
  status: WardStatus;
  createdAt: string;
  updatedAt: string;
}
