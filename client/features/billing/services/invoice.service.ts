/**
 * Invoice / Billing Service — Member 6
 * Handles all API calls related to patient invoices and payment processing.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { Invoice, PaymentStatus, ApiSuccessResponse } from '@/shared/types';

export interface CreateInvoicePayload {
  patientId: string;
  totalAmount: number;
  appointmentId?: string;
}

export interface CreateInvoicePayloadWithOptionalAppointment extends CreateInvoicePayload {
  appointmentId?: string;
}

type AssertValidAppointmentId<T extends CreateInvoicePayload> =
  T['appointmentId'] extends undefined ? T :
  T['appointmentId'] extends '' ? never : T;

export type ValidCreateInvoicePayload = AssertValidAppointmentId<CreateInvoicePayload>;

export interface InvoiceFilters {
  paymentStatus?: PaymentStatus;
  patientId?: string;
}

export const invoiceService = {
  /**
   * Create a new invoice for a patient. Admin only.
   */
  createInvoice: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const res = await apiClient.post<ApiSuccessResponse<Invoice>>(
      ENDPOINTS.INVOICES.BASE,
      payload,
    );
    return res.data.data;
  },

  /**
   * Fetch all invoices for the authenticated patient.
   */
  getMyBills: async (): Promise<Invoice[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ invoices: Invoice[]; count: number }>>(
      ENDPOINTS.INVOICES.MY_BILLS,
    );
    return res.data.data.invoices;
  },

  /**
   * Fetch all invoices (admin view), with optional filters.
   */
  getAllInvoices: async (filters?: InvoiceFilters): Promise<Invoice[]> => {
    const res = await apiClient.get<ApiSuccessResponse<{ invoices: Invoice[]; count: number }>>(
      ENDPOINTS.INVOICES.BASE,
      {
        params: filters,
      },
    );
    return res.data.data.invoices;
  },

  /**
   * Fetch a single invoice by ID.
   */
  getInvoiceById: async (id: string): Promise<Invoice> => {
    const res = await apiClient.get<ApiSuccessResponse<Invoice>>(
      ENDPOINTS.INVOICES.BY_ID(id),
    );
    return res.data.data;
  },

  /**
   * Upload a payment receipt for a specific invoice.
   * Sets status to "Pending Verification". Patient + ownership enforced.
   *
   * @param id - Invoice ID
   * @param formData - Must contain a file field named "file"
   */
  uploadPaymentReceipt: async (id: string, formData: FormData): Promise<Invoice> => {
    const res = await apiClient.put<ApiSuccessResponse<Invoice>>(
      ENDPOINTS.INVOICES.UPLOAD_RECEIPT(id),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.data;
  },

  /**
   * Mark an invoice as fully paid after verifying the receipt. Admin only.
   */
  verifyPayment: async (id: string): Promise<Invoice> => {
    const res = await apiClient.put<ApiSuccessResponse<Invoice>>(
      ENDPOINTS.INVOICES.VERIFY(id),
      {},
    );
    return res.data.data;
  },

  /**
   * Delete an invoice. Admin only.
   */
  deleteInvoice: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.INVOICES.BY_ID(id));
  },
};
