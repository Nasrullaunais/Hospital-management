import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { paymentService } from '@/features/billing/services/payment.service';
import type { Invoice } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function PaymentConfirmationScreen() {
  const { id, method } = useLocalSearchParams<{ id: string; method: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bank transfer state
  const [receiptFile, setReceiptFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
  } | null>(null);

  const isMockCard = method === 'mock_card';
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

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

  const handlePickReceipt = useCallback(async () => {
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

      setReceiptFile({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || 'application/octet-stream',
      });
    } catch (err: unknown) {
      console.error('handlePickReceipt failed:', err);
      Alert.alert('Error', 'Failed to pick document.');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!id) return;

    if (!isMockCard && !receiptFile) {
      Alert.alert('Receipt Required', 'Please upload a transfer receipt before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      // Create payment record
      await paymentService.createPayment(id, isMockCard ? 'mock_card' : 'bank_transfer');

      if (!isMockCard && receiptFile) {
        // Upload receipt for bank transfer
        const formData = new FormData();
        formData.append('paymentReceipt', {
          uri: receiptFile.uri,
          name: receiptFile.name,
          type: receiptFile.mimeType,
        } as unknown as Blob);

        await invoiceService.uploadPaymentReceipt(id, formData);
      }

      // Navigate to success
      router.replace(`/(patient)/billing/pay/success/${id}?method=${method}`);
    } catch (err: unknown) {
      console.error('Payment submission failed:', err);
      Alert.alert(
        'Payment Failed',
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [id, method, isMockCard, receiptFile, router]);

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Invoice Summary */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
          {isMockCard ? 'Card Payment' : 'Bank Transfer'}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Invoice</Text>
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {invoice.invoiceNumber ?? invoice._id}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Amount</Text>
          <Text style={[styles.summaryValue, { color: theme.text, fontWeight: '700' }]}>
            {formatCurrency(invoice.totalAmount)}
          </Text>
        </View>
      </View>

      {isMockCard ? (
        /* Card Payment Form */
        <View>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
              Card Details
            </Text>

            <View style={styles.cardFieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Card Number</Text>
              <View
                style={[
                  styles.cardField,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                ]}
              >
                <Ionicons name="card-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.cardFieldInput, { color: theme.inputText }]}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="number-pad"
                  maxLength={19}
                />
              </View>
            </View>

            <View style={styles.cardRow}>
              <View style={[styles.cardFieldHalf, { marginRight: spacing.sm }]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Expiry</Text>
                <View
                  style={[
                    styles.cardField,
                    { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                  ]}
                >
                  <TextInput
                    style={[styles.cardFieldInput, { color: theme.inputText }]}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={[styles.cardFieldHalf, { marginLeft: spacing.sm }]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>CVV</Text>
                <View
                  style={[
                    styles.cardField,
                    { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                  ]}
                >
                  <TextInput
                    style={[styles.cardFieldInput, { color: theme.inputText }]}
                    placeholder="123"
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>

            <View style={styles.cardFieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Cardholder Name
              </Text>
              <View
                style={[
                  styles.cardField,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.cardFieldInput, { color: theme.inputText }]}
                  placeholder="John Doe"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.noticeCard,
              { backgroundColor: theme.primaryMuted, borderColor: theme.border },
            ]}
          >
            <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
            <Text style={[styles.noticeText, { color: theme.primary }]}>
              This is a simulated payment. Stripe integration coming soon.
            </Text>
          </View>
        </View>
      ) : (
        /* Bank Transfer Details */
        <View>
          <View
            style={[
              styles.bankDetailsCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
              Bank Account Details
            </Text>

            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: theme.textTertiary }]}>Bank</Text>
              <Text style={[styles.bankValue, { color: theme.text }]}>Sample Bank</Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: theme.textTertiary }]}>
                Account Name
              </Text>
              <Text style={[styles.bankValue, { color: theme.text }]}>
                Hospital Management
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: theme.textTertiary }]}>
                Account Number
              </Text>
              <Text style={[styles.bankValue, { color: theme.text, fontFamily: 'monospace' }]}>
                1234567890
              </Text>
            </View>
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: theme.textTertiary }]}>Branch</Text>
              <Text style={[styles.bankValue, { color: theme.text }]}>Main Branch</Text>
            </View>
            <View style={[styles.bankDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.bankRow}>
              <Text style={[styles.bankLabel, { color: theme.textTertiary }]}>Reference</Text>
              <Text style={[styles.bankValue, { color: theme.primary, fontWeight: '600' }]}>
                INV-{invoice.invoiceNumber ?? invoice._id.slice(-6)}
              </Text>
            </View>
          </View>

          {/* Receipt Upload */}
          <View
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
              Upload Transfer Receipt
            </Text>

            {receiptFile ? (
              <View style={styles.receiptPreview}>
                <View style={[styles.receiptFileInfo, { backgroundColor: theme.surfaceSecondary }]}>
                  <Ionicons
                    name={receiptFile.mimeType === 'application/pdf' ? 'document-text' : 'image'}
                    size={24}
                    color={theme.primary}
                  />
                  <Text style={[styles.receiptFileName, { color: theme.text }]} numberOfLines={1}>
                    {receiptFile.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setReceiptFile(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={22} color={theme.error} />
                  </TouchableOpacity>
                </View>
                {receiptFile.mimeType?.startsWith('image/') && (
                  <Image
                    source={{ uri: receiptFile.uri }}
                    style={[styles.receiptImage, { backgroundColor: theme.surfaceTertiary }]}
                    resizeMode="contain"
                  />
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: theme.border }]}
                onPress={handlePickReceipt}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-upload-outline" size={32} color={theme.primary} />
                <Text style={[styles.uploadButtonText, { color: theme.primary }]}>
                  Tap to Upload Receipt
                </Text>
                <Text style={[styles.uploadButtonHint, { color: theme.textTertiary }]}>
                  JPG, PNG, or PDF
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Confirm Button */}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          {
            backgroundColor: theme.accent,
            opacity: submitting ? 0.6 : 1,
          },
        ]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={isMockCard ? 'card' : 'checkmark-done'}
              size={20}
              color="#fff"
              style={{ marginRight: spacing.sm }}
            />
            <Text style={styles.confirmButtonText}>
              {isMockCard ? 'Confirm Payment' : 'Submit Payment'}
            </Text>
          </>
        )}
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
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  cardFieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  cardFieldInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  cardFieldHalf: {
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  bankDetailsCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bankLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  bankValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  bankDivider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  uploadButton: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  uploadButtonHint: {
    fontSize: 12,
  },
  receiptPreview: {
    gap: spacing.sm,
  },
  receiptFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  receiptFileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  receiptImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
  },
  confirmButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
    ...shadows.button,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  errorText: {
    fontSize: 16,
    marginTop: spacing.sm,
  },
});
