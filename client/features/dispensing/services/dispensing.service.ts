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
};
