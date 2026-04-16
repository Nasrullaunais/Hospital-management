/**
 * Prescription Service — handles prescription API calls.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse } from '@/shared/types';

export interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  quantity: number;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  patientId: string | { _id: string; name: string; email: string };
  doctorId: string | { _id: string; specialization: string; userId?: { name: string } };
  items: PrescriptionItem[];
  notes?: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
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
};
