/**
 * Auth & Patient Service — Member 1
 * Handles all API calls related to authentication and patient profile.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { User, AuthResponse, ApiSuccessResponse } from '@/shared/types';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
}

export const authService = {
  /**
   * Register a new patient account.
   */
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    try {
      console.log('[AUTH] registering:', payload.email);
      const res = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
        ENDPOINTS.AUTH.REGISTER,
        payload,
      );
      return res.data.data;
    } catch (err) {
      console.error('[AUTH] registration failed:', (err as Error).message);
      throw err;
    }
  },

  /**
   * Authenticate and receive a JWT token.
   */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
      ENDPOINTS.AUTH.LOGIN,
      payload,
    );
    return res.data.data;
  },

  /**
   * Fetch the authenticated user's profile.
   */
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<ApiSuccessResponse<User>>(ENDPOINTS.PATIENTS.ME);
    return res.data.data;
  },

  /**
   * Update profile text fields. Pass FormData to also upload an ID document image.
   */
  updateProfile: async (payload: UpdateProfilePayload | FormData): Promise<User> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.put<ApiSuccessResponse<User>>(
      ENDPOINTS.PATIENTS.ME,
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Permanently delete the authenticated user account.
   */
  deleteProfile: async (): Promise<void> => {
    await apiClient.delete(ENDPOINTS.PATIENTS.ME);
  },
};
