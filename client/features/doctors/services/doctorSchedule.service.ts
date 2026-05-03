/**
 * Doctor Schedule Service
 * Handles API calls related to doctor scheduling and available slots.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse, DoctorSchedule, AvailableSlotsResponse } from '@/shared/types';

export interface UpsertSchedulePayload {
  doctorId: string;
  weeklySlots: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[];
  slotDuration?: number;
  exceptions?: { date: string; isAvailable: boolean; reason?: string }[];
}

export const doctorScheduleService = {
  getSchedule: async (doctorId: string): Promise<DoctorSchedule | null> => {
    const res = await apiClient.get<ApiSuccessResponse<{ schedule: DoctorSchedule | null }>>(
      ENDPOINTS.DOCTORS.SCHEDULE_BY_DOCTOR(doctorId),
    );
    return res.data.data.schedule;
  },

  upsertSchedule: async (payload: UpsertSchedulePayload): Promise<DoctorSchedule> => {
    const res = await apiClient.post<ApiSuccessResponse<{ schedule: DoctorSchedule }>>(
      ENDPOINTS.DOCTORS.SCHEDULE,
      payload,
    );
    return res.data.data.schedule;
  },

  getAvailableSlots: async (doctorId: string, date: string): Promise<AvailableSlotsResponse> => {
    const res = await apiClient.get<ApiSuccessResponse<AvailableSlotsResponse>>(
      ENDPOINTS.DOCTORS.AVAILABLE_SLOTS(doctorId, date),
    );
    return res.data.data;
  },
};