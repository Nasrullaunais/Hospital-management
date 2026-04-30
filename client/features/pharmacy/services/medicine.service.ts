/**
 * Medicine / Pharmacy Service — Member 5
 * Handles all API calls related to the medicine inventory.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { Medicine, ApiSuccessResponse } from '@/shared/types';

export interface MedicineFilters {
  category?: string;
  name?: string;
  minStock?: number;
  maxStock?: number;
  expiringWithinDays?: number;
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

export interface AdjustStockPayload {
  quantityChange: number;
}

export const medicineService = {
  /**
   * Fetch all medicines, optionally filtered by category.
   */
  getMedicines: async (filters?: MedicineFilters): Promise<Medicine[]> => {
    const params: Record<string, string | number> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.name) params.name = filters.name;
    if (filters?.minStock !== undefined) params.minStock = filters.minStock;
    if (filters?.maxStock !== undefined) params.maxStock = filters.maxStock;
    if (filters?.expiringWithinDays !== undefined) params.expiringWithinDays = filters.expiringWithinDays;

    const res = await apiClient.get<ApiSuccessResponse<{ medicines: Medicine[]; count: number; total: number }>>(
      ENDPOINTS.MEDICINES.BASE,
      { params },
    );
    return res.data.data.medicines;
  },

  /**
   * Fetch a single medicine by ID.
   */
  getMedicineById: async (id: string): Promise<Medicine> => {
    const res = await apiClient.get<ApiSuccessResponse<{ medicine: Medicine }>>(
      ENDPOINTS.MEDICINES.BY_ID(id),
    );
    return res.data.data.medicine;
  },

  /**
   * Create a new medicine. Admin only.
   * Pass FormData to include a packaging image.
   */
  createMedicine: async (payload: CreateMedicinePayload | FormData): Promise<Medicine> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.post<ApiSuccessResponse<{ medicine: Medicine }>>(
      ENDPOINTS.MEDICINES.BASE,
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data.medicine;
  },

  /**
   * Update a medicine. Admin only.
   * Sends JSON fields such as name/category/price/expiryDate.
   */
  updateMedicine: async (id: string, payload: UpdateMedicinePayload | FormData): Promise<Medicine> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.put<ApiSuccessResponse<{ medicine: Medicine }>>(
      ENDPOINTS.MEDICINES.BY_ID(id),
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data.medicine;
  },

  adjustStock: async (id: string, payload: AdjustStockPayload): Promise<Medicine> => {
    const res = await apiClient.patch<ApiSuccessResponse<{ medicine: Medicine; quantityChange: number }>>(
      ENDPOINTS.MEDICINES.ADJUST_STOCK(id),
      payload,
    );
    return res.data.data.medicine;
  },

  getMedicinesByIds: async (ids: string[]): Promise<Medicine[]> => {
    const res = await apiClient.post<ApiSuccessResponse<{ medicines: Medicine[] }>>(
      ENDPOINTS.MEDICINES.BATCH,
      { ids },
    );
    return res.data.data.medicines;
  },

  /**
   * Delete a medicine from inventory. Admin only.
   */
  deleteMedicine: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.MEDICINES.BY_ID(id));
  },
};
