/**
 * Appointment Service — Member 3
 * Handles all API calls related to appointment booking and management.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { Appointment, AppointmentStatus, ApiSuccessResponse } from '@/shared/types';

export interface BookAppointmentPayload {
  doctorId: string;
  appointmentDate: string; // ISO 8601 string
  reasonForVisit?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
}

export const appointmentService = {
  /**
   * Book a new appointment. Authenticated patients only.
   * Pass FormData to include a referral document.
   */
  bookAppointment: async (payload: BookAppointmentPayload | FormData): Promise<Appointment> => {
    const isFormData = payload instanceof FormData;
    const res = await apiClient.post<ApiSuccessResponse<Appointment>>(
      ENDPOINTS.APPOINTMENTS.BASE,
      payload,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
    );
    return res.data.data;
  },

  /**
   * Fetch all appointments for the currently authenticated patient.
   */
  getMyAppointments: async (): Promise<Appointment[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[]; count: number }>>(
      ENDPOINTS.APPOINTMENTS.MY_APPOINTMENTS,
    );
    return res.data.data.appointments;
  },

  /**
   * Fetch all appointments for a specific doctor. Doctor / Admin only.
   */
  getDoctorSchedule: async (doctorId: string): Promise<Appointment[]> => {
    const res = await apiClient.get<ApiSuccessResponse<Appointment[]>>(
      ENDPOINTS.APPOINTMENTS.DOCTOR_SCHEDULE(doctorId),
    );
    return res.data.data;
  },

  /**
   * Update appointment status (Confirm, Complete, Cancel). Doctor / Admin only.
   */
  updateAppointmentStatus: async (
    id: string,
    payload: UpdateAppointmentStatusPayload,
  ): Promise<Appointment> => {
    const res = await apiClient.put<ApiSuccessResponse<Appointment>>(
      ENDPOINTS.APPOINTMENTS.UPDATE_STATUS(id),
      payload,
    );
    return res.data.data;
  },

  /**
   * Cancel an appointment. Patient who booked it only.
   */
  cancelAppointment: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.APPOINTMENTS.CANCEL(id));
  },
};
