/**
 * Medical Records Service — Member 4
 * Handles all API calls related to patient medical records.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { MedicalRecord, ApiSuccessResponse } from '@/shared/types';

export interface CreateRecordPayload {
  patientId: string;
  diagnosis: string;
  prescription?: string;
  dateRecorded?: string; // ISO 8601 — defaults to now on backend
}

export interface UpdateRecordPayload {
  diagnosis?: string;
  prescription?: string;
  dateRecorded?: string;
}

export const recordService = {
  /**
   * Create a new medical record for a patient. Doctor only.
   * Pass FormData to include a lab report PDF/image.
   */
  createRecord: async (payload: CreateRecordPayload | FormData): Promise<MedicalRecord> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.post<ApiSuccessResponse<MedicalRecord>>(
      ENDPOINTS.RECORDS.BASE,
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Fetch all medical records for a patient.
   * Patients can only access their own records; doctors/admins can access any.
   */
  getPatientRecords: async (patientId: string): Promise<MedicalRecord[]> => {
    const res = await apiClient.get<ApiSuccessResponse<MedicalRecord[]>>(
      ENDPOINTS.RECORDS.BY_PATIENT(patientId),
    );
    return res.data.data;
  },

  /**
   * Fetch a single medical record by its ID.
   * Ownership enforced on backend — patients can only see own records.
   */
  getRecordById: async (id: string): Promise<MedicalRecord> => {
    const res = await apiClient.get<ApiSuccessResponse<MedicalRecord>>(
      ENDPOINTS.RECORDS.BY_ID(id),
    );
    return res.data.data;
  },

  /**
   * Update a medical record. Doctor only.
   * Pass FormData to replace/add a lab report file.
   */
  updateRecord: async (
    id: string,
    payload: UpdateRecordPayload | FormData,
  ): Promise<MedicalRecord> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.put<ApiSuccessResponse<MedicalRecord>>(
      ENDPOINTS.RECORDS.BY_ID(id),
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Delete a medical record. Admin only.
   */
  deleteRecord: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.RECORDS.BY_ID(id));
  },
};
