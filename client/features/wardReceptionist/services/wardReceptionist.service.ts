import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse } from '@/shared/types';

export interface WardStats {
  totalWards: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
}

export interface BedStatus {
  _id: string;
  bedId: string;
  wardId: string;
  wardName: string;
  bedNumber: number;
  status: 'occupied' | 'vacant' | 'reserved' | 'maintenance';
  patientId?: string;
  patientName?: string;
  admissionDate?: string;
  expectedDischarge?: string;
}

export interface WardAssignment {
  _id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  wardId: string;
  wardName: string;
  bedId: string;
  bedNumber: number;
  assignedDate: string;
  assignedBy: string;
  status: 'active' | 'discharged' | 'transferred';
  notes?: string;
}

export interface WardAssignmentFilters {
  wardId?: string;
  status?: 'active' | 'discharged' | 'transferred';
  patientId?: string;
}

export interface AssignPatientPayload {
  patientId: string;
  wardId: string;
  bedNumber: number;
  admissionDate: string;
  notes?: string;
}

export interface PatientMedication {
  _id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'discontinued';
  notes?: string;
}

export interface PatientSummary {
  _id: string;
  name: string;
  dateOfBirth?: string;
  phone?: string;
  gender?: string;
  bloodType?: string;
  admissionDate?: string;
  wardId?: string;
  wardName?: string;
  bedId?: string;
  bedNumber?: number;
  diagnosis?: string;
}

export const wardReceptionistService = {
  getWardStats: async (): Promise<WardStats> => {
    const res = await apiClient.get<ApiSuccessResponse<WardStats>>(ENDPOINTS.WARD_RECEPTIONIST.STATS);
    return res.data.data;
  },

  getBedStatuses: async (wardId?: string): Promise<BedStatus[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ beds: BedStatus[] }>>(
      ENDPOINTS.WARD_RECEPTIONIST.BED_STATUSES,
      { params: wardId ? { wardId } : undefined },
    );
    return res.data.data.beds;
  },

  getWardAssignments: async (
    wardId: string,
    filters?: WardAssignmentFilters,
  ): Promise<WardAssignment[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ assignments: WardAssignment[] }>>(
      ENDPOINTS.WARD_RECEPTIONIST.ASSIGNMENTS(wardId),
      { params: filters },
    );
    return res.data.data.assignments;
  },

  assignPatient: async (payload: AssignPatientPayload): Promise<WardAssignment> => {
    const res = await apiClient.post<ApiSuccessResponse<{ assignment: WardAssignment }>>(
      ENDPOINTS.WARD_RECEPTIONIST.ASSIGNMENTS_BASE,
      payload,
    );
    return res.data.data.assignment;
  },

  unassignPatient: async (assignmentId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.WARD_RECEPTIONIST.UNASSIGN(assignmentId));
  },

  getPatientMedications: async (patientId: string): Promise<PatientMedication[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ medications: PatientMedication[] }>>(
      ENDPOINTS.WARD_RECEPTIONIST.PATIENT_MEDICATIONS(patientId),
    );
    return res.data.data.medications;
  },

  getPatients: async (wardId: string): Promise<PatientSummary[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ patients: PatientSummary[] }>>(
      ENDPOINTS.WARD_RECEPTIONIST.PATIENTS(wardId),
    );
    return res.data.data.patients;
  },
};