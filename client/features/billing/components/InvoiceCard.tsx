import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type { Invoice, PaymentStatus } from '@/shared/types';
import { invoiceService } from '@/features/billing/services/invoice.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { getPaymentStatusStyle } from '@/shared/utils/statusStyles';

const FORM_FIELD_RECEIPT = 'paymentReceipt' as const;

interface InvoiceCardProps {
  invoice: Invoice;
  isAdmin: boolean;
  canManage?: boolean;
  userRole?: string;
  onUpdate: (updated: Invoice) => void;
}

export function InvoiceCard({ invoice, isAdmin, canManage, userRole, onUpdate }: InvoiceCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();

  const isOverdue = invoice.paymentStatus === 'Overdue';
  const statusStyle = getPaymentStatusStyle(invoice.paymentStatus, theme);

  const isPatient = userRole === 'patient';
  const canVerify = isAdmin || canManage;

  const handlePayNow = useCallback(() => {
    router.push(`/(patient)/billing/pay/${invoice._id}`);
  }, [invoice._id, router]);

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
              formData.append(FORM_FIELD_RECEIPT, {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream',
              } as unknown as Blob);

              const updated = await invoiceService.uploadPaymentReceipt(invoice._id, formData);
              onUpdate(updated);
              Alert.alert('Success', 'Receipt uploaded successfully. Awaiting verification.');
            } catch (err: unknown) {
              console.error('handleUploadReceipt - upload failed:', err);
              Alert.alert('Error', err instanceof Error ? err.message : 'Upload failed.');
            }
          },
        },
      ]);
    } catch (err: unknown) {
      console.error('handleUploadReceipt - document pick failed:', err);
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
          } catch (err: unknown) {
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
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed.');
          }
        },
      },
    ]);
  }, [invoice, onUpdate]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: isOverdue ? theme.error : theme.border }]}>
      {isOverdue && (
        <View style={[styles.overdueAccent, { backgroundColor: theme.error }]} />
      )}
      <View style={styles.cardHeader}>
        <View style={styles.amountContainer}>
          <Text style={[styles.currency, { color: theme.text }]}>$</Text>
          <Text style={[styles.amount, { color: theme.text }]}>{invoice.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}>
          {isOverdue && <Feather name="alert-triangle" size={12} color={statusStyle.text} />}
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
        {isPatient && (invoice.paymentStatus === 'Unpaid' || isOverdue) && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isOverdue ? theme.error : theme.accent, flex: 1.5 }]}
            onPress={handlePayNow}
            activeOpacity={0.8}
          >
            <Feather name="credit-card" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.actionButtonText}>Pay Now</Text>
          </TouchableOpacity>
        )}

        {isPatient && invoice.paymentStatus === 'Unpaid' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1 }]}
            onPress={handleUploadReceipt}
            activeOpacity={0.8}
          >
            <Feather name="upload" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.actionButtonText}>Upload Receipt</Text>
          </TouchableOpacity>
        )}

        {canVerify && invoice.paymentStatus === 'Pending Verification' && (
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
    position: 'relative',
    overflow: 'hidden',
  },
  overdueAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
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