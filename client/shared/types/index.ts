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

export type UserRole = 'patient' | 'doctor' | 'admin' | 'pharmacist' | 'receptionist';

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

// ── Lab Report ──────────────────────────────────────────────────────────────

export type LabType = 'hematology' | 'biochemistry' | 'microbiology' | 'urinalysis' | 'radiology' | 'serology' | 'pathology' | 'other';
export type LabReportStatus = 'pending' | 'sample_collected' | 'in_progress' | 'completed' | 'reviewed';
export type LabResultFlag = 'normal' | 'high' | 'low' | 'critical';

export interface LabResult {
  parameter: string;
  value: number;
  unit: string;
  normalRange?: string;
  flag: LabResultFlag;
}

export interface LabReport {
  _id: string;
  patientId: string | User;
  doctorId: string | Doctor;
  medicalRecordId?: string;
  appointmentId?: string;
  labType: LabType;
  testDate: string;
  status: LabReportStatus;
  results: LabResult[];
  interpretation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Report Generation ────────────────────────────────────────────────────────

export type ReportType = 'lab-report' | 'prescription' | 'medical-certificate';

export interface ReportGenerateResponse {
  downloadUrl: string;
  fileKey: string;
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

export type PaymentStatus = 'Unpaid' | 'Pending Verification' | 'Paid' | 'Overdue';

export interface Invoice {
  _id: string;
  patientId: string | User;
  appointmentId?: string | Appointment;
  invoiceNumber?: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  issuedDate: string;
  dueDate?: string;
  paymentReceiptUrl?: string;
}

// ── Prescription ─────────────────────────────────────────────────────────────────

export type PrescriptionStatus = 'active' | 'fulfilled' | 'cancelled';

export interface PrescriptionItem {
  medicineId: string | { _id: string; name?: string };
  medicineName: string;
  dosage: string;
  quantity: number;
}

export interface PendingPrescription {
  _id: string;
  patientId: string | { _id: string; name?: string };
  doctorId: string | { _id: string; userId?: { name?: string } };
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  createdAt: string;
}

// ── Ward ────────────────────────────────────────────────────────────────────────

export type WardType = 'general' | 'private' | 'icu' | 'emergency';
export type WardStatus = 'available' | 'full' | 'maintenance';

export interface Ward {
  _id: string;
  name: string;
  type: WardType;
  totalBeds: number;
  currentOccupancy: number;
  status: WardStatus;
  location: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}
