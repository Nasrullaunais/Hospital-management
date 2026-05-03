/**
 * Invoice / Billing Service — Member 6
 * Handles all API calls related to patient invoices and payment processing.
 */
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type {
  Invoice,
  InvoiceItem,
  InvoiceStats,
  PaymentStatus,
  ApiSuccessResponse,
  BillingSuggestion,
  BillingSuggestionsResponse,
  PendingBillingPatient,
} from '@/shared/types';

// ── Currency Formatting ────────────────────────────────────────────────────────

export const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ── Create Invoice Payload ─────────────────────────────────────────────────────

export interface CreateInvoicePayload {
  patientId: string;
  items: InvoiceItem[];
  appointmentId?: string;
  discount?: number;
  notes?: string;
}

type AssertValidAppointmentId<T extends CreateInvoicePayload> =
  T['appointmentId'] extends undefined ? T
    : T['appointmentId'] extends '' ? never : T;

export type ValidCreateInvoicePayload = AssertValidAppointmentId<CreateInvoicePayload>;

// ── Filters ────────────────────────────────────────────────────────────────────

export interface InvoiceFilters {
  status?: PaymentStatus;
  patientId?: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const invoiceService = {
  /**
   * Fetch aggregate invoice stats for the admin dashboard.
   */
  getInvoiceStats: async (): Promise<InvoiceStats> => {
    const res = await apiClient.get<ApiSuccessResponse<InvoiceStats>>(
      ENDPOINTS.INVOICES.STATS,
    );
    return res.data.data;
  },

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
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.patientId) params.patientId = filters.patientId;

    const res = await apiClient.get<ApiSuccessResponse<{ invoices: Invoice[]; count: number }>>(
      ENDPOINTS.INVOICES.BASE,
      { params },
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
      { paymentStatus: 'Paid' },
    );
    return res.data.data;
  },

  /**
   * Delete an invoice. Admin only.
   */
  deleteInvoice: async (id: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.INVOICES.BY_ID(id));
  },

  /**
   * Fetch patients with unbilled charges (for receptionist dashboard).
   */
  getPendingPatients: async (): Promise<PendingBillingPatient[]> => {
    const res = await apiClient.get<ApiSuccessResponse<PendingBillingPatient[]>>(
      ENDPOINTS.INVOICES.PENDING_PATIENTS,
    );
    return res.data.data;
  },

  /**
   * Fetch billing suggestions for a patient (unbilled dispensing, appointments, etc.).
   */
  getSuggestions: async (patientId: string, appointmentId?: string): Promise<BillingSuggestionsResponse> => {
    const res = await apiClient.get<ApiSuccessResponse<BillingSuggestionsResponse>>(
      ENDPOINTS.INVOICES.SUGGESTIONS(patientId, appointmentId),
    );
    return res.data.data;
  },
};
