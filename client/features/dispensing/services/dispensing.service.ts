/**
 * Dispensing Service — handles prescription dispensing API calls.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { PendingPrescription, ApiSuccessResponse } from '@/shared/types';

export interface DispensePayload {
  medicineId: string;
  quantityDispensed: number;
}

export const dispensingService = {
  getPendingPrescriptions: async () => {
    const res = await apiClient.get<ApiSuccessResponse<PendingPrescription[]>>(ENDPOINTS.PRESCRIPTIONS.PENDING);
    return res.data.data;
  },

  dispensePrescription: async (prescriptionId: string, dispensedItems: DispensePayload[]) => {
    const res = await apiClient.post<ApiSuccessResponse<any>>(
      ENDPOINTS.DISPENSE.BASE,
      { prescriptionId, dispensedItems }
    );
    return res.data.data;
  },
};
