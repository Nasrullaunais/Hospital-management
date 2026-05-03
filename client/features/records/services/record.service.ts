/**
 * Medical Records Service — Member 4
 * Handles all API calls related to patient medical records.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { MedicalRecord, PopulatedMedicalRecord, ApiSuccessResponse } from '@/shared/types';

export interface UpdateRecordPayload {
  diagnosis?: string;
  prescription?: string;
}

export const recordService = {
  /**
   * Create a new medical record for a patient. Doctor only.
   * Pass FormData to include a lab report PDF/image.
   * Returns a populated record shape since the server populates doctorId.
   */
  createRecord: async (payload: FormData): Promise<PopulatedMedicalRecord> => {
    const res = await apiClient.post<ApiSuccessResponse<{ record: PopulatedMedicalRecord }>>(
      ENDPOINTS.RECORDS.BASE,
      payload,
    );
    return res.data.data.record;
  },

  /**
   * Fetch all medical records for a patient (populated with doctor name).
   * Patients can only access their own records; doctors/admins can access any.
   */
  getPatientHistory: async (patientId: string): Promise<PopulatedMedicalRecord[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ records: PopulatedMedicalRecord[]; count: number }>>(
      ENDPOINTS.RECORDS.BY_PATIENT(patientId),
    );
    return res.data.data.records;
  },

  /**
   * Fetch all records created by the currently authenticated doctor.
   */
  getDoctorLogs: async (): Promise<PopulatedMedicalRecord[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ records: PopulatedMedicalRecord[]; count: number }>>(
      ENDPOINTS.RECORDS.DOCTOR_LOGS,
    );
    return res.data.data.records;
  },

  /**
   * Fetch a single medical record by its ID (populated with doctor and patient).
   */
  getRecordById: async (id: string): Promise<PopulatedMedicalRecord> => {
    const res = await apiClient.get<ApiSuccessResponse<{ record: PopulatedMedicalRecord }>>(
      ENDPOINTS.RECORDS.BY_ID(id),
    );
    return res.data.data.record;
  },

  /**
   * Update a medical record. Doctor only.
   */
  updateRecord: async (
    id: string,
    payload: UpdateRecordPayload,
  ): Promise<MedicalRecord> => {
    const res = await apiClient.put<ApiSuccessResponse<{ record: MedicalRecord }>>(
      ENDPOINTS.RECORDS.BY_ID(id),
      payload,
    );
    return res.data.data.record;
  },

  /**
   * Delete a medical record. Admin only.
   */
  deleteRecord: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.RECORDS.BY_ID(id));
  },
};