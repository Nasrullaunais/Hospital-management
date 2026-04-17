/**
 * Department Service
 * Handles all API calls related to department management.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse } from '@/shared/types';
import type { Department } from '@/shared/types';

export interface CreateDepartmentPayload {
  name: string;
  description: string;
  headDoctorId?: string;
  location: string;
  phone: string;
  status?: 'active' | 'inactive';
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
  headDoctorId?: string;
  location?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

export const departmentService = {
  /**
   * Fetch all departments, optionally filtered by status.
   * Requires authentication.
   */
  getDepartments: async (filters?: { status?: 'active' | 'inactive' }): Promise<Department[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ departments: Department[]; count: number }>>(
      ENDPOINTS.DEPARTMENTS.BASE,
      { params: filters },
    );
    return res.data.data.departments;
  },

  /**
   * Fetch a single department by ID.
   * Requires authentication.
   */
  getDepartmentById: async (id: string): Promise<Department> => {
    const res = await apiClient.get<ApiSuccessResponse<{ department: Department }>>(
      ENDPOINTS.DEPARTMENTS.BY_ID(id),
    );
    return res.data.data.department;
  },

  /**
   * Create a new department. Admin only.
   */
  createDepartment: async (payload: CreateDepartmentPayload): Promise<Department> => {
    const res = await apiClient.post<ApiSuccessResponse<{ department: Department }>>(
      ENDPOINTS.DEPARTMENTS.BASE,
      payload,
    );
    return res.data.data.department;
  },

  /**
   * Update a department. Admin only.
   */
  updateDepartment: async (id: string, payload: UpdateDepartmentPayload): Promise<Department> => {
    const res = await apiClient.put<ApiSuccessResponse<{ department: Department }>>(
      ENDPOINTS.DEPARTMENTS.BY_ID(id),
      payload,
    );
    return res.data.data.department;
  },

  /**
   * Delete a department. Admin only.
   */
  deleteDepartment: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.DEPARTMENTS.BY_ID(id));
  },
};
