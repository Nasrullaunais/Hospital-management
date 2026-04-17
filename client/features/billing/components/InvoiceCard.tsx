import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { Invoice, PaymentStatus } from '@/shared/types';
import { invoiceService } from '@/features/billing/services/invoice.service';

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string }> = {
  Unpaid: { bg: '#fee2e2', text: '#991b1b' },
  'Pending Verification': { bg: '#fef9c3', text: '#854d0e' },
  Paid: { bg: '#dcfce7', text: '#166534' },
};

interface InvoiceCardProps {
  invoice: Invoice;
  isAdmin: boolean;
  onUpdate: (updated: Invoice) => void;
}

export function InvoiceCard({ invoice, isAdmin, onUpdate }: InvoiceCardProps) {
  const colors = STATUS_STYLES[invoice.paymentStatus];

  const handleUploadReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      // File validation
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.mimeType || '')) {
        Alert.alert('Invalid File', 'Only JPG, PNG, or PDF files are accepted.');
        return;
      }

      // Note: DocumentPicker doesn't provide size directly, but we can check URI-based
      // For actual size check, you'd need to fetch the blob first

      Alert.alert('Upload Confirmation', `Upload ${file.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append('paymentReceipt', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream',
              } as any);

              const updated = await invoiceService.uploadPaymentReceipt(invoice._id, formData);
              onUpdate(updated);
              Alert.alert('Success', 'Receipt uploaded successfully. Awaiting verification.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Upload failed.');
            }
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleVerify = async () => {
    Alert.alert('Verify Payment', 'Mark this invoice as Paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try {
            const updated = await invoiceService.verifyPayment(invoice._id);
            onUpdate(updated);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Verification failed.');
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    Alert.alert('Delete Invoice', 'Are you sure you want to delete this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await invoiceService.deleteInvoice(invoice._id);
            Alert.alert('Success', 'Invoice deleted.');
            // Notify parent to remove this invoice from list
            onUpdate({ ...invoice, _deleted: true } as Invoice & { _deleted: boolean });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>${invoice.totalAmount.toFixed(2)}</Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{invoice.paymentStatus}</Text>
        </View>
      </View>

      <Text style={styles.date}>
        Issued: {new Date(invoice.issuedDate).toLocaleDateString()}
      </Text>

      {invoice.appointmentId && (
        <Text style={styles.meta}>
          Appointment: {typeof invoice.appointmentId === 'string' ? invoice.appointmentId : invoice.appointmentId._id}
        </Text>
      )}

      <View style={styles.actions}>
        {!isAdmin && invoice.paymentStatus === 'Unpaid' && (
          <TouchableOpacity style={styles.payButton} onPress={handleUploadReceipt}>
            <Text style={styles.payButtonText}>Upload Receipt</Text>
          </TouchableOpacity>
        )}

        {isAdmin && invoice.paymentStatus === 'Pending Verification' && (
          <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
            <Text style={styles.verifyButtonText}>Verify Payment</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  amount: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 12, color: '#888', marginBottom: 2 },
  meta: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  actions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  payButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  payButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  verifyButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  verifyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default InvoiceCard;