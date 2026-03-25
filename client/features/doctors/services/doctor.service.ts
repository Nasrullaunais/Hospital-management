/**
 * Doctor Service — Member 2
 * Handles all API calls related to doctor listings and management.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { Doctor, DoctorAvailability, ApiSuccessResponse } from '@/shared/types';

export interface DoctorFilters {
  specialization?: string;
  availability?: DoctorAvailability;
}

export interface CreateDoctorPayload {
  userId: string;
  specialization: string;
  experienceYears: number;
  consultationFee: number;
  availability?: DoctorAvailability;
}

export interface UpdateDoctorPayload {
  specialization?: string;
  experienceYears?: number;
  consultationFee?: number;
  availability?: DoctorAvailability;
}

export const doctorService = {
  /**
   * Fetch all doctors, optionally filtered by specialization or availability.
   * Public endpoint — no auth required.
   */
  getDoctors: async (filters?: DoctorFilters): Promise<Doctor[]> => {
    const res = await apiClient.get<ApiSuccessResponse<Doctor[]>>(ENDPOINTS.DOCTORS.BASE, {
      params: filters,
    });
    return res.data.data;
  },

  /**
   * Fetch a single doctor profile by ID.
   * Public endpoint — no auth required.
   */
  getDoctorById: async (id: string): Promise<Doctor> => {
    const res = await apiClient.get<ApiSuccessResponse<Doctor>>(ENDPOINTS.DOCTORS.BY_ID(id));
    return res.data.data;
  },

  /**
   * Create a new doctor profile. Admin only.
   */
  createDoctor: async (payload: CreateDoctorPayload): Promise<Doctor> => {
    const res = await apiClient.post<ApiSuccessResponse<Doctor>>(ENDPOINTS.DOCTORS.BASE, payload);
    return res.data.data;
  },

  /**
   * Update a doctor profile. Admin or the doctor themselves.
   * Pass FormData to also upload a license document.
   */
  updateDoctor: async (id: string, payload: UpdateDoctorPayload | FormData): Promise<Doctor> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.put<ApiSuccessResponse<Doctor>>(
      ENDPOINTS.DOCTORS.BY_ID(id),
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Delete a doctor profile. Admin only.
   */
  deleteDoctor: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.DOCTORS.BY_ID(id));
  },
};
