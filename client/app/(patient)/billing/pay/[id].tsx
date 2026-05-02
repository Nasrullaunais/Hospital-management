import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { invoiceService } from '@/features/billing/services/invoice.service';
import type { Invoice } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getPaymentStatusStyle } from '@/shared/utils/statusStyles';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

type PaymentMethod = 'mock_card' | 'bank_transfer' | null;

export default function PaymentMethodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch (err: unknown) {
      console.error('fetchInvoice failed:', err);
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

  if (!invoice) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>Invoice not found</Text>
      </View>
    );
  }

  const statusStyle = getPaymentStatusStyle(invoice.paymentStatus, theme);
  const isOverdue = invoice.paymentStatus === 'Overdue';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Invoice Summary */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Payment For</Text>

        <View style={styles.invoiceHeader}>
          <Text style={[styles.invoiceNumber, { color: theme.text }]}>
            {invoice.invoiceNumber ?? 'Invoice'}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {invoice.paymentStatus}
            </Text>
          </View>
        </View>

        <Text style={[styles.date, { color: theme.textSecondary }]}>
          Issued: {new Date(invoice.issuedDate).toLocaleDateString()}
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.totalSection}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Due</Text>
          <Text style={[styles.totalAmount, { color: isOverdue ? theme.error : theme.text }]}>
            {formatCurrency(invoice.totalAmount)}
          </Text>
        </View>
        {isOverdue && (
          <Text style={[styles.overdueNotice, { color: theme.error }]}>
            This invoice is overdue. Please pay as soon as possible.
          </Text>
        )}
      </View>

      {/* Select Payment Method */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Payment Method</Text>

      <TouchableOpacity
        style={[
          styles.methodCard,
          {
            backgroundColor: theme.surface,
            borderColor: selectedMethod === 'mock_card' ? theme.accent : theme.border,
          },
          selectedMethod === 'mock_card' && { ...shadows.cardHover },
        ]}
        onPress={() => setSelectedMethod('mock_card')}
        activeOpacity={0.7}
      >
        <View style={[styles.methodIconContainer, { backgroundColor: theme.primaryMuted }]}>
          <Ionicons name="card-outline" size={28} color={theme.primary} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={[styles.methodTitle, { color: theme.text }]}>Card Payment</Text>
          <Text style={[styles.methodSubtitle, { color: theme.textSecondary }]}>
            Instant payment (simulated)
          </Text>
        </View>
        {selectedMethod === 'mock_card' && (
          <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.methodCard,
          {
            backgroundColor: theme.surface,
            borderColor: selectedMethod === 'bank_transfer' ? theme.accent : theme.border,
          },
          selectedMethod === 'bank_transfer' && { ...shadows.cardHover },
        ]}
        onPress={() => setSelectedMethod('bank_transfer')}
        activeOpacity={0.7}
      >
        <View style={[styles.methodIconContainer, { backgroundColor: theme.primaryMuted }]}>
          <Ionicons name="document-attach-outline" size={28} color={theme.primary} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={[styles.methodTitle, { color: theme.text }]}>Bank Transfer</Text>
          <Text style={[styles.methodSubtitle, { color: theme.textSecondary }]}>
            Upload receipt for verification
          </Text>
        </View>
        {selectedMethod === 'bank_transfer' && (
          <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
        )}
      </TouchableOpacity>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          {
            backgroundColor: selectedMethod ? theme.accent : theme.surfaceTertiary,
            opacity: selectedMethod ? 1 : 0.5,
          },
        ]}
        disabled={!selectedMethod}
        onPress={() => {
          if (!selectedMethod || !id) return;
          router.push(`/(patient)/billing/pay/confirm/${id}?method=${selectedMethod}`);
        }}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.continueButtonText,
            { color: selectedMethod ? '#fff' : theme.textTertiary },
          ]}
        >
          Continue
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: spacing.md,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  overdueNotice: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  methodIconContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 13,
  },
  continueButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.button,
  },
  continueButtonText: {
    fontWeight: '700',
    fontSize: 17,
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
});
