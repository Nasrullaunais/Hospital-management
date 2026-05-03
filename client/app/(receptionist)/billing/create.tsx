import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BillingCreateForm } from '@/features/billing/components/BillingCreateForm';
import type { User } from '@/shared/types';

export default function CreateInvoiceScreen() {
  const params = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
  }>();

  const initialPatient: User | undefined =
    params.patientId && params.patientName
      ? {
          _id: params.patientId,
          name: params.patientName,
          email: params.patientEmail || '',
          role: 'patient',
          phone: '',
          dateOfBirth: '',
          idDocumentUrl: '',
          createdAt: '',
          updatedAt: '',
        }
      : undefined;

  return <BillingCreateForm initialPatient={initialPatient} />;
}