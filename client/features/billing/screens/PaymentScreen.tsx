import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { invoiceService } from '../services/invoice.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice } from '@/shared/types';

interface Props {
  invoiceId: string;
  onPaymentSubmitted?: () => void;
}

/**
 * PaymentScreen — Member 6
 * Allows a patient to upload a payment receipt for a specific invoice.
 * TODO: Accept `invoiceId` from Expo Router navigation params.
 * TODO: Replace manual URI input with expo-document-picker or expo-image-picker.
 * TODO: Show receipt image preview after selection.
 */
export default function PaymentScreen({ invoiceId, onPaymentSubmitted }: Props) {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the invoice so we can show the amount and current status
    invoiceService
      .getMyBills()
      .then((bills) => {
        const found = bills.find((b) => b._id === invoiceId);
        if (found) setInvoice(found);
        else setError('Invoice not found.');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load invoice.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handleUploadReceipt = async () => {
    /**
     * TODO: Replace this with a real file picker.
     * Example using expo-document-picker:
     *   import * as DocumentPicker from 'expo-document-picker';
     *   const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
     *   if (result.canceled) return;
     *   const file = result.assets[0];
     *   const formData = new FormData();
     *   formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
     *   await invoiceService.uploadPaymentReceipt(invoiceId, formData);
     */
    Alert.alert(
      'Upload Receipt',
      'TODO: Integrate expo-document-picker here to select a payment receipt image or PDF.',
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Invoice not found.'}</Text>
      </View>
    );
  }

  if (invoice.paymentStatus !== 'Unpaid') {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>
          {invoice.paymentStatus === 'Pending Verification'
            ? '⏳ Your payment receipt is under review.'
            : '✅ This invoice has been paid.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Make Payment</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Amount Due</Text>
        <Text style={styles.summaryAmount}>${invoice.totalAmount.toFixed(2)}</Text>
        <Text style={styles.summaryDate}>
          Issued: {new Date(invoice.issuedDate).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.instructions}>
        Transfer the amount to the hospital bank account, then upload proof of payment below.
        Your invoice status will change to <Text style={{ fontWeight: '700' }}>Pending Verification</Text> until confirmed by admin.
      </Text>

      {/* TODO: Add bank account details here */}

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleUploadReceipt}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>📎 Upload Payment Receipt</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: '#3b82f6', fontWeight: '600', marginBottom: 4 },
  summaryAmount: { fontSize: 36, fontWeight: '800', color: '#1d4ed8', marginBottom: 4 },
  summaryDate: { fontSize: 12, color: '#6b7280' },
  instructions: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 15 },
  infoText: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 24 },
});
