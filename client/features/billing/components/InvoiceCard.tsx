import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type { Invoice, PaymentStatus } from '@/shared/types';
import { invoiceService } from '@/features/billing/services/invoice.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

interface InvoiceCardProps {
  invoice: Invoice;
  isAdmin: boolean;
  onUpdate: (updated: Invoice) => void;
}

export function InvoiceCard({ invoice, isAdmin, onUpdate }: InvoiceCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const statusStyle = useMemo(() => {
    switch (invoice.paymentStatus) {
      case 'Unpaid':
        return { bg: theme.errorBg, text: theme.error };
      case 'Pending Verification':
        return { bg: theme.warningBg, text: theme.warning };
      case 'Paid':
        return { bg: theme.successBg, text: theme.success };
      default:
        return { bg: theme.surfaceTertiary, text: theme.textSecondary };
    }
  }, [invoice.paymentStatus, theme]);

  const handleUploadReceipt = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];

      if (!validTypes.includes(file.mimeType || '')) {
        Alert.alert('Invalid File', 'Only JPG, PNG, or PDF files are accepted.');
        return;
      }

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
  }, [invoice._id, onUpdate]);

  const handleVerify = useCallback(async () => {
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
  }, [invoice._id, onUpdate]);

  const handleDelete = useCallback(async () => {
    Alert.alert('Delete Invoice', 'Are you sure you want to delete this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await invoiceService.deleteInvoice(invoice._id);
            Alert.alert('Success', 'Invoice deleted.');
            onUpdate({ ...invoice, _deleted: true } as Invoice & { _deleted: boolean });
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed.');
          }
        },
      },
    ]);
  }, [invoice, onUpdate]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.amountContainer}>
          <Text style={[styles.currency, { color: theme.text }]}>$</Text>
          <Text style={[styles.amount, { color: theme.text }]}>{invoice.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>{invoice.paymentStatus}</Text>
        </View>
      </View>

      <Text style={[styles.date, { color: theme.textSecondary }]}>
        Issued: {new Date(invoice.issuedDate).toLocaleDateString()}
      </Text>

      {invoice.appointmentId && (
        <Text style={[styles.meta, { color: theme.textTertiary }]}>
          Appointment: {typeof invoice.appointmentId === 'string' ? invoice.appointmentId : invoice.appointmentId._id}
        </Text>
      )}

      <View style={styles.actions}>
        {!isAdmin && invoice.paymentStatus === 'Unpaid' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleUploadReceipt}
            activeOpacity={0.8}
          >
            <Feather name="upload" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.actionButtonText}>Upload Receipt</Text>
          </TouchableOpacity>
        )}

        {isAdmin && invoice.paymentStatus === 'Pending Verification' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.success }]}
            onPress={handleVerify}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.actionButtonText}>Verify Payment</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error }]}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  amountContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  currency: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  amount: { fontSize: 24, fontWeight: '700' },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 12, marginBottom: spacing.xs },
  meta: { fontSize: 12, marginBottom: spacing.xs },
  actions: { marginTop: spacing.md, flexDirection: 'row', gap: spacing.sm },
  actionButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default InvoiceCard;