import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { invoiceService } from '@/features/billing/services/invoice.service';
import type { Invoice } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function PaymentSuccessScreen() {
  const { id, method } = useLocalSearchParams<{ id: string; method: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const isBankTransfer = method === 'bank_transfer';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const methodLabel = isBankTransfer ? 'Bank Transfer' : 'Card Payment';
  const methodIcon = isBankTransfer ? 'time-outline' : 'checkmark-circle';
  const iconColor = isBankTransfer ? theme.warning : theme.success;

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch {
      // Payment already succeeded, invoice fetch is secondary
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={[styles.iconContainer, { backgroundColor: isBankTransfer ? theme.warningBg : theme.successBg }]}>
          <Ionicons name={isBankTransfer ? 'time-outline' : 'checkmark-circle'} size={80} color={iconColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          {isBankTransfer ? 'Receipt Submitted' : 'Payment Successful!'}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {isBankTransfer
            ? 'Your payment is being verified. This usually takes 24-48 hours.'
            : 'Your payment has been processed successfully.'}
        </Text>

        {/* Payment Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Invoice</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {invoice?.invoiceNumber ?? id}
            </Text>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Amount</Text>
            <Text style={[styles.detailValue, { color: theme.text, fontWeight: '700' }]}>
              {invoice ? formatCurrency(invoice.totalAmount) : '—'}
            </Text>
          </View>

          <View style={[styles.detailDivider, { backgroundColor: theme.divider }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Method</Text>
            <View style={styles.methodBadge}>
              <Ionicons
                name={isBankTransfer ? 'document-attach' : 'card'}
                size={16}
                color={theme.primary}
              />
              <Text style={[styles.detailValue, { color: theme.primary }]}>{methodLabel}</Text>
            </View>
          </View>

          {!isBankTransfer && (
            <>
              <View style={[styles.detailDivider, { backgroundColor: theme.divider }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.textTertiary }]}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: theme.successBg }]}>
                  <Text style={[styles.statusText, { color: theme.success }]}>Completed</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/(patient)/billing/${id}`)}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={20} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.primaryButtonText}>View Invoice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.border }]}
          onPress={() => router.push('/(patient)/billing')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={theme.primary} style={{ marginRight: spacing.sm }} />
          <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Back to Bills</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  detailsCard: {
    width: '100%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  detailDivider: {
    height: 1,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.button,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  secondaryButton: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
