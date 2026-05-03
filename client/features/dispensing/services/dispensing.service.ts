/**
 * Dispensing Service — handles prescription dispensing API calls.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { PendingPrescription, ApiSuccessResponse } from '@/shared/types';

export interface DispensePayload {
  medicineId: string;
  medicineName: string;
  quantityDispensed: number;
}

export interface DispenseResponse {
  prescriptionId: string;
  dispensedAt: string;
  dispensedItems: Array<{ medicineId: string; quantityDispensed: number }>;
}

export interface DispenseRecord {
  _id: string;
  prescriptionId: string;
  patientId: string;
  pharmacistId: string | { _id: string; name?: string };
  dispensedItems: Array<{
    medicineId: string;
    medicineName: string;
    dosage?: string;
    quantityPrescribed: number;
    quantityDispensed: number;
    instructions?: string;
  }>;
  status: 'fulfilled' | 'partial' | 'cancelled';
  fulfilledAt: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export const dispensingService = {
  getPendingPrescriptions: async (skip = 0, limit = 20) => {
    const res = await apiClient.get<ApiSuccessResponse<{ prescriptions: PendingPrescription[]; total: number; skip: number; limit: number }>>(
      ENDPOINTS.PRESCRIPTIONS.PENDING,
      { params: { skip, limit } },
    );
    return res.data.data.prescriptions;
  },

  dispensePrescription: async (prescriptionId: string, dispensedItems: DispensePayload[]) => {
    const res = await apiClient.post<ApiSuccessResponse<DispenseResponse>>(
      ENDPOINTS.DISPENSE.BASE,
      { prescriptionId, dispensedItems }
    );
    return res.data.data;
  },

  getPatientDispenseHistory: async (patientId: string): Promise<DispenseRecord[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ dispenses: DispenseRecord[] }>>(
      ENDPOINTS.DISPENSE.PATIENT_HISTORY(patientId),
    );
    return res.data.data.dispenses;
  },
};
