import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { invoiceService } from '@/features/billing/services/invoice.service';
import type { Invoice, InvoiceItem } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getPaymentStatusStyle } from '@/shared/utils/statusStyles';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function PatientInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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

  const showPayNow = invoice &&
    (invoice.paymentStatus === 'Unpaid' || invoice.paymentStatus === 'Overdue');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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
  const isOverdue = invoice.paymentStatus === 'Overdue';
  const items = invoice.items ?? [];
  const discount = invoice.discount ?? 0;
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const grandTotal = invoice.totalAmount;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Invoice Header Card */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: theme.surface, borderColor: isOverdue ? theme.error : theme.border },
        ]}
      >
        {isOverdue && (
          <View style={[styles.overdueAccent, { backgroundColor: theme.error }]} />
        )}
        <View style={styles.amountSection}>
          <Text style={[styles.amount, { color: theme.text }]}>
            {formatCurrency(grandTotal)}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }]}>
            {isOverdue && <Feather name="alert-triangle" size={14} color={statusStyle.text} />}
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {invoice.paymentStatus}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Invoice ID</Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {invoice.invoiceNumber ?? invoice._id}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Issued Date</Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {new Date(invoice.issuedDate).toLocaleDateString()}
            </Text>
          </View>

          {invoice.dueDate && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>Due Date</Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {new Date(invoice.dueDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          {invoice.appointmentId && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: theme.textTertiary }]}>Appointment</Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {typeof invoice.appointmentId === 'string'
                  ? invoice.appointmentId
                  : invoice.appointmentId._id}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Invoice Items Card */}
      {items.length > 0 && (
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
            Invoice Items
          </Text>

          {items.map((item: InvoiceItem, index: number) => {
            const lineTotal = item.quantity * item.unitPrice;
            return (
              <View key={`invoice-item-${item.description || 'item'}-${index}`}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemDescription, { color: theme.text }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemSubtext, { color: theme.textSecondary }]}>
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.text }]}>
                    {formatCurrency(lineTotal)}
                  </Text>
                </View>
                {index < items.length - 1 && (
                  <View style={[styles.itemDivider, { backgroundColor: theme.divider }]} />
                )}
              </View>
            );
          })}

          <View style={[styles.divider, { marginTop: spacing.md }]} />

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>
              {formatCurrency(subtotal)}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: theme.success }]}>
                -{formatCurrency(discount)}
              </Text>
            </View>
          )}

          <View style={[styles.grandTotalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.grandTotalLabel, { color: theme.text }]}>Grand Total</Text>
            <Text style={[styles.grandTotalValue, { color: theme.text }]}>
              {formatCurrency(grandTotal)}
            </Text>
          </View>
        </View>
      )}

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

      {/* Action Buttons */}
      {showPayNow && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: isOverdue ? theme.error : theme.accent }]}
            onPress={() => router.push(`/(patient)/billing/pay/${invoice._id}`)}
            activeOpacity={0.8}
          >
            <Feather name="credit-card" size={20} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.payButtonText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {invoice.notes && (
        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Notes</Text>
          <Text style={[styles.notesText, { color: theme.textSecondary }]}>{invoice.notes}</Text>
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemDescription: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemSubtext: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDivider: {
    height: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  payButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.button,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
});
