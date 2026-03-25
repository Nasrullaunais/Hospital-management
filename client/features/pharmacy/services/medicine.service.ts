/**
 * Medicine / Pharmacy Service — Member 5
 * Handles all API calls related to the medicine inventory.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { Medicine, ApiSuccessResponse } from '@/shared/types';

export interface MedicineFilters {
  category?: string;
}

export interface CreateMedicinePayload {
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  expiryDate: string; // ISO 8601
}

export interface UpdateMedicinePayload {
  name?: string;
  category?: string;
  price?: number;
  stockQuantity?: number;
  expiryDate?: string;
}

export const medicineService = {
  /**
   * Fetch all medicines, optionally filtered by category.
   */
  getMedicines: async (filters?: MedicineFilters): Promise<Medicine[]> => {
    const res = await apiClient.get<ApiSuccessResponse<Medicine[]>>(ENDPOINTS.MEDICINES.BASE, {
      params: filters,
    });
    return res.data.data;
  },

  /**
   * Fetch a single medicine by ID.
   */
  getMedicineById: async (id: string): Promise<Medicine> => {
    const res = await apiClient.get<ApiSuccessResponse<Medicine>>(ENDPOINTS.MEDICINES.BY_ID(id));
    return res.data.data;
  },

  /**
   * Create a new medicine. Admin only.
   * Pass FormData to include a packaging image.
   */
  createMedicine: async (payload: CreateMedicinePayload | FormData): Promise<Medicine> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.post<ApiSuccessResponse<Medicine>>(
      ENDPOINTS.MEDICINES.BASE,
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Update a medicine. Admin only.
   * Pass FormData to replace the packaging image.
   */
  updateMedicine: async (
    id: string,
    payload: UpdateMedicinePayload | FormData,
  ): Promise<Medicine> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.put<ApiSuccessResponse<Medicine>>(
      ENDPOINTS.MEDICINES.BY_ID(id),
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Delete a medicine from inventory. Admin only.
   */
  deleteMedicine: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.MEDICINES.BY_ID(id));
  },
};
