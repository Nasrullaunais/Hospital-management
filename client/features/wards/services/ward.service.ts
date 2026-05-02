/**
 * Ward Service
 * Handles all API calls related to ward management.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse } from '@/shared/types';
import type { Ward } from '@/shared/types';

export interface WardFilters {
  type?: 'general' | 'private' | 'icu' | 'emergency';
  status?: 'available' | 'full' | 'maintenance';
}

export interface CreateWardPayload {
  name: string;
  type: 'general' | 'private' | 'icu' | 'emergency';
  totalBeds: number;
  currentOccupancy?: number;
  location?: string;
  phone?: string;
}

export interface UpdateWardPayload {
  name?: string;
  type?: 'general' | 'private' | 'icu' | 'emergency';
  totalBeds?: number;
  currentOccupancy?: number;
  status?: 'available' | 'full' | 'maintenance';
  location?: string;
  phone?: string;
}

export interface UpdateBedsPayload {
  currentOccupancy: number;
}

export const wardService = {
  /**
   * Fetch all wards, optionally filtered by department, type, or status.
   * Requires authentication.
   */
  getWards: async (filters?: WardFilters): Promise<Ward[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ wards: Ward[]; count: number }>>(
      ENDPOINTS.WARDS.BASE,
      { params: filters },
    );
    return res.data.data.wards;
  },

  /**
   * Fetch a single ward by ID.
   * Requires authentication.
   */
  getWardById: async (id: string): Promise<Ward> => {
    const res = await apiClient.get<ApiSuccessResponse<{ ward: Ward }>>(
      ENDPOINTS.WARDS.BY_ID(id),
    );
    return res.data.data.ward;
  },

  /**
   * Create a new ward. Admin only.
   */
  createWard: async (payload: CreateWardPayload): Promise<Ward> => {
    const res = await apiClient.post<ApiSuccessResponse<{ ward: Ward }>>(
      ENDPOINTS.WARDS.BASE,
      payload,
    );
    return res.data.data.ward;
  },

  /**
   * Update a ward. Admin only.
   */
  updateWard: async (id: string, payload: UpdateWardPayload): Promise<Ward> => {
    const res = await apiClient.put<ApiSuccessResponse<{ ward: Ward }>>(
      ENDPOINTS.WARDS.BY_ID(id),
      payload,
    );
    return res.data.data.ward;
  },

  /**
   * Delete a ward. Admin only.
   */
  deleteWard: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.WARDS.BY_ID(id));
  },

  /**
   * Update bed occupancy. Admin only.
   * Auto-sets status based on new occupancy.
   */
  updateBeds: async (id: string, payload: UpdateBedsPayload): Promise<Ward> => {
    const res = await apiClient.patch<ApiSuccessResponse<{ ward: Ward }>>(
      ENDPOINTS.WARDS.UPDATE_BEDS(id),
      payload,
    );
    return res.data.data.ward;
  },
};
