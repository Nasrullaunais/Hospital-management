import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse, Payment } from '@/shared/types';

export const paymentService = {
  createPayment: async (invoiceId: string, method: 'mock_card' | 'bank_transfer') => {
    const { data } = await apiClient.post<ApiSuccessResponse<Payment>>(
      ENDPOINTS.PAYMENTS.BASE,
      { invoiceId, method },
    );
    return data.data;
  },

  getPaymentsByInvoice: async (invoiceId: string) => {
    const { data } = await apiClient.get<ApiSuccessResponse<Payment[]>>(
      ENDPOINTS.PAYMENTS.BY_INVOICE(invoiceId),
    );
    return data.data;
  },

  getPaymentById: async (id: string) => {
    const { data } = await apiClient.get<ApiSuccessResponse<Payment>>(
      ENDPOINTS.PAYMENTS.BY_ID(id),
    );
    return data.data;
  },

  processPayment: async (id: string) => {
    const { data } = await apiClient.post<ApiSuccessResponse<Payment>>(
      ENDPOINTS.PAYMENTS.PROCESS(id),
    );
    return data.data;
  },
};
