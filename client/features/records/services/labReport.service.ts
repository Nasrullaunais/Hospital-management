/**
 * Lab Report Service — Member 4
 * Handles all API calls related to lab reports (CRUD, review, and listing).
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { LabReport, ApiSuccessResponse } from '@/shared/types';

export interface CreateLabReportPayload {
  patientId: string;
  labType: string;
  testDate?: string;
  medicalRecordId?: string;
  appointmentId?: string;
  results: {
    parameter: string;
    value: number;
    unit: string;
    normalRange?: string;
    flag?: string;
  }[];
  interpretation?: string;
  notes?: string;
}

export interface UpdateLabReportPayload {
  labType?: string;
  status?: string;
  results?: CreateLabReportPayload['results'];
  interpretation?: string;
  notes?: string;
}

export const labReportService = {
  /**
   * Create a new lab report for a patient. Doctor only.
   * Returns the created lab report.
   */
  createLabReport: async (payload: CreateLabReportPayload): Promise<LabReport> => {
    const res = await apiClient.post<ApiSuccessResponse<{ labReport: LabReport }>>(
      ENDPOINTS.LAB_REPORTS.BASE,
      payload,
    );
    return res.data.data.labReport;
  },

  /**
   * Fetch all lab reports for a specific patient.
   * Doctors can access any patient's reports; patients can only access their own.
   */
  getPatientLabReports: async (patientId: string): Promise<LabReport[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ labReports: LabReport[]; count: number }>>(
      ENDPOINTS.LAB_REPORTS.BY_PATIENT(patientId),
    );
    return res.data.data.labReports;
  },

  /**
   * Fetch a single lab report by its ID (populated with patient and doctor).
   */
  getLabReportById: async (id: string): Promise<LabReport> => {
    const res = await apiClient.get<ApiSuccessResponse<{ labReport: LabReport }>>(
      ENDPOINTS.LAB_REPORTS.BY_ID(id),
    );
    return res.data.data.labReport;
  },

  /**
   * Update a lab report. Doctor only.
   * Can modify lab type, status, results, interpretation, and notes.
   */
  updateLabReport: async (id: string, payload: UpdateLabReportPayload): Promise<LabReport> => {
    const res = await apiClient.put<ApiSuccessResponse<{ labReport: LabReport }>>(
      ENDPOINTS.LAB_REPORTS.BY_ID(id),
      payload,
    );
    return res.data.data.labReport;
  },

  /**
   * Mark a lab report as reviewed. Doctor only.
   * Changes status from 'completed' to 'reviewed'.
   */
  reviewLabReport: async (id: string): Promise<LabReport> => {
    const res = await apiClient.patch<ApiSuccessResponse<{ labReport: LabReport }>>(
      ENDPOINTS.LAB_REPORTS.REVIEW(id),
    );
    return res.data.data.labReport;
  },

  /**
   * Delete a lab report. Admin only.
   */
  deleteLabReport: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.LAB_REPORTS.BY_ID(id));
  },
};