/**
 * Report Generation Service — Member 4
 * Handles API calls for generating and downloading PDF reports.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse, ReportGenerateResponse } from '@/shared/types';

export const reportService = {
  /**
   * Generate a lab report PDF from a lab report ID.
   */
  generateLabReport: async (labReportId: string): Promise<ReportGenerateResponse> => {
    const res = await apiClient.post<ApiSuccessResponse<ReportGenerateResponse>>(
      ENDPOINTS.REPORTS.LAB_REPORT,
      { labReportId },
    );
    return res.data.data;
  },

  /**
   * Generate a prescription PDF from a prescription ID.
   */
  generatePrescriptionPDF: async (prescriptionId: string): Promise<ReportGenerateResponse> => {
    const res = await apiClient.post<ApiSuccessResponse<ReportGenerateResponse>>(
      ENDPOINTS.REPORTS.PRESCRIPTION,
      { prescriptionId },
    );
    return res.data.data;
  },

  /**
   * Generate a medical certificate PDF from a record ID.
   */
  generateMedicalCertificate: async (recordId: string, restFrom?: string, restTo?: string): Promise<ReportGenerateResponse> => {
    const res = await apiClient.post<ApiSuccessResponse<ReportGenerateResponse>>(
      ENDPOINTS.REPORTS.MEDICAL_CERTIFICATE,
      { recordId, restFrom, restTo },
    );
    return res.data.data;
  },
};