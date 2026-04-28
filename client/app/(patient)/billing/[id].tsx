import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { invoiceService } from '@/features/billing/services/invoice.service';
import type { Invoice } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getPaymentStatusStyle } from '@/shared/utils/statusStyles';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function PatientInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch (err: unknown) {
      console.error('fetchInvoice failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>
          {error || 'Invoice not found'}
        </Text>
      </View>
    );
  }

  const statusStyle = getPaymentStatusStyle(invoice.paymentStatus, theme);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Invoice Header Card */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.amountSection}>
          <Text style={[styles.amount, { color: theme.text }]}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(invoice.totalAmount)}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {invoice.paymentStatus}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>
              Invoice ID
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {invoice.invoiceNumber ?? invoice._id}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>
              Issued Date
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {new Date(invoice.issuedDate).toLocaleDateString()}
            </Text>
          </View>

          {invoice.appointmentId && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>
                Appointment
              </Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {typeof invoice.appointmentId === 'string'
                  ? invoice.appointmentId
                  : invoice.appointmentId._id}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Payment Receipt Section */}
      {invoice.paymentReceiptUrl && (
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
            Payment Receipt
          </Text>
          <Image
            source={{ uri: invoice.paymentReceiptUrl }}
            style={[
              styles.receiptImage,
              { backgroundColor: theme.surfaceTertiary },
            ]}
            resizeMode="contain"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  detailSection: {
    gap: spacing.md,
  },
  detailRow: {},
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
});
