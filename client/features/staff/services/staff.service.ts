import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { User, ApiSuccessResponse } from '@/shared/types';

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role: 'receptionist' | 'pharmacist';
}

export const staffService = {
  getStaff: async (role?: 'receptionist' | 'pharmacist'): Promise<User[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ users: User[] }>>(
      ENDPOINTS.ADMIN.USERS,
      { params: role ? { role } : undefined },
    );
    return res.data.data.users;
  },

  createStaff: async (payload: CreateStaffPayload): Promise<User> => {
    const res = await apiClient.post<ApiSuccessResponse<{ user: User }>>(
      ENDPOINTS.ADMIN.USERS,
      payload,
    );
    return res.data.data.user;
  },

  deleteStaff: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.ADMIN.USER_BY_ID(id));
  },
};
