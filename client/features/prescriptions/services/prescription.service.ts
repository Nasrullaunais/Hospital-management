/**
 * Prescription Service — handles prescription API calls.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse, PendingPrescription, PrescriptionStatus } from '@/shared/types';

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  quantity: number;
  instructions?: string;
}

export interface Prescription extends Omit<PendingPrescription, 'status'> {
  status: PrescriptionStatus;
  updatedAt: string;
}

export const prescriptionService = {
  getMyPrescriptions: async (patientId: string): Promise<Prescription[]> => {
    const res = await apiClient.get<ApiSuccessResponse<Prescription[]>>(
      ENDPOINTS.PRESCRIPTIONS.BY_PATIENT(patientId)
    );
    return res.data.data;
  },

  getPrescriptionById: async (id: string): Promise<Prescription> => {
    const res = await apiClient.get<ApiSuccessResponse<Prescription>>(
      ENDPOINTS.PRESCRIPTIONS.BY_ID(id)
    );
    return res.data.data;
  },

  createPrescription: async (data: {
    patientId: string;
    medicalRecordId?: string;
    items: PrescriptionItem[];
    notes?: string;
  }): Promise<Prescription> => {
    const res = await apiClient.post<ApiSuccessResponse<Prescription>>(
      ENDPOINTS.PRESCRIPTIONS.BASE,
      data,
    );
    return res.data.data;
  },

  getPrescriptionsByRecordId: async (recordId: string): Promise<Prescription[]> => {
    const res = await apiClient.get<ApiSuccessResponse<Prescription[]>>(
      ENDPOINTS.PRESCRIPTIONS.BY_RECORD(recordId),
    );
    return res.data.data;
  },

  cancelPrescription: async (id: string): Promise<Prescription> => {
    const res = await apiClient.put<ApiSuccessResponse<Prescription>>(
      ENDPOINTS.PRESCRIPTIONS.CANCEL(id),
    );
    return res.data.data;
  },
};
