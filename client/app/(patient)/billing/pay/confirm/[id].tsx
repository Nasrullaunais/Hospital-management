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

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  // Card errors state
  const [cardErrors, setCardErrors] = useState<{
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    cardholderName?: string;
  }>({});

  // Touched state for tracking blur events
  const [touched, setTouched] = useState({
    cardNumber: false,
    expiry: false,
    cvv: false,
    cardholderName: false,
  });

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

  // ========== VALIDATION HELPERS ==========

  const detectCardType = (num: string): string => {
    const cleanNum = num.replace(/\s/g, '');
    if (/^4/.test(cleanNum)) return 'Visa';
    if (/^5[1-5]/.test(cleanNum)) return 'Mastercard';
    if (/^2[2-7]/.test(cleanNum)) return 'Mastercard';
    if (/^3[47]/.test(cleanNum)) return 'Amex';
    if (/^6(?:011|5)/.test(cleanNum)) return 'Discover';
    return '';
  };

  const validateCardNumber = (num: string): string | undefined => {
    const cleanNum = num.replace(/\s/g, '');
    if (!cleanNum) return 'Card number is required';
    if (!/^\d{13,19}$/.test(cleanNum)) return 'Card number must be 13-19 digits';

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = cleanNum.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNum[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    if (sum % 10 !== 0) return 'Invalid card number (failed Luhn check)';

    return undefined;
  };

  const validateExpiry = (exp: string): string | undefined => {
    if (!exp) return 'Expiry is required';
    if (!/^\d{2}\/\d{2}$/.test(exp)) return 'Use MM/YY format';

    const month = parseInt(exp.slice(0, 2), 10);
    const year = parseInt(exp.slice(3, 5), 10);

    if (month < 1 || month > 12) return 'Month must be 01-12';

    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    // Year must be current year or up to 10 years ahead
    if (year < currentYear || year > currentYear + 10) return 'Year out of valid range';

    // Check if expired
    if (year === currentYear && month < currentMonth) return 'Card has expired';

    return undefined;
  };

  const validateCvv = (cv: string, cardType: string): string | undefined => {
    if (!cv) return 'CVV is required';
    const expectedLength = cardType === 'Amex' ? 4 : 3;
    if (!/^\d+$/.test(cv)) return 'CVV must be digits only';
    if (cv.length !== expectedLength) {
      return `CVV must be ${expectedLength} digits`;
    }
    return undefined;
  };

  const validateCardholderName = (name: string): string | undefined => {
    if (!name || !name.trim()) return 'Cardholder name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s\-']+$/.test(name)) return 'Name can only contain letters, spaces, hyphens, apostrophes';
    return undefined;
  };

  // ========== AUTO-FORMATTING HANDLERS ==========

  const handleCardNumberChange = (text: string) => {
    // Strip non-digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 16 digits (for formatting)
    const limited = cleaned.slice(0, 16);
    // Auto-format with space every 4 digits
    const formatted = limited.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    setCardNumber(formatted);
    // Clear error when user starts typing
    if (touched.cardNumber && cardErrors.cardNumber) {
      setCardErrors((prev) => ({ ...prev, cardNumber: undefined }));
    }
  };

  const handleExpiryChange = (text: string) => {
    // Strip non-digits
    const cleaned = text.replace(/\D/g, '');
    // Limit to 4 digits
    const limited = cleaned.slice(0, 4);
    // Auto-format as MM/YY
    let formatted = limited;
    if (limited.length >= 2) {
      formatted = limited.slice(0, 2) + '/' + limited.slice(2);
    }
    setExpiry(formatted);
    // Clear error when user starts typing
    if (touched.expiry && cardErrors.expiry) {
      setCardErrors((prev) => ({ ...prev, expiry: undefined }));
    }
  };

  const handleCvvChange = (text: string) => {
    // Digits only
    const cleaned = text.replace(/\D/g, '');
    // Limit based on card type (Amex=4, others=3)
    const cardType = detectCardType(cardNumber);
    const maxLength = cardType === 'Amex' ? 4 : 3;
    const limited = cleaned.slice(0, maxLength);
    setCvv(limited);
    // Clear error when user starts typing
    if (touched.cvv && cardErrors.cvv) {
      setCardErrors((prev) => ({ ...prev, cvv: undefined }));
    }
  };

  const handleCardholderNameChange = (text: string) => {
    // Capitalize words
    const capitalized = text
      .replace(/[^a-zA-Z\s\-']/g, '')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    setCardholderName(capitalized);
    // Clear error when user starts typing
    if (touched.cardholderName && cardErrors.cardholderName) {
      setCardErrors((prev) => ({ ...prev, cardholderName: undefined }));
    }
  };

  // ========== BLUR HANDLERS ==========

  const handleCardNumberBlur = () => {
    setTouched((prev) => ({ ...prev, cardNumber: true }));
    const error = validateCardNumber(cardNumber);
    if (error) {
      setCardErrors((prev) => ({ ...prev, cardNumber: error }));
    }
  };

  const handleExpiryBlur = () => {
    setTouched((prev) => ({ ...prev, expiry: true }));
    const error = validateExpiry(expiry);
    if (error) {
      setCardErrors((prev) => ({ ...prev, expiry: error }));
    }
  };

  const handleCvvBlur = () => {
    setTouched((prev) => ({ ...prev, cvv: true }));
    const cardType = detectCardType(cardNumber);
    const error = validateCvv(cvv, cardType);
    if (error) {
      setCardErrors((prev) => ({ ...prev, cvv: error }));
    }
  };

  const handleCardholderNameBlur = () => {
    setTouched((prev) => ({ ...prev, cardholderName: true }));
    const error = validateCardholderName(cardholderName);
    if (error) {
      setCardErrors((prev) => ({ ...prev, cardholderName: error }));
    }
  };

  // ========== SUBMIT HANDLER ==========

  const handleSubmit = useCallback(async () => {
    if (!id) return;

    if (!isMockCard && !receiptFile) {
      Alert.alert('Receipt Required', 'Please upload a transfer receipt before submitting.');
      return;
    }

    // Card payment validation
    if (isMockCard) {
      const cardType = detectCardType(cardNumber);
      const errors = {
        cardNumber: validateCardNumber(cardNumber),
        expiry: validateExpiry(expiry),
        cvv: validateCvv(cvv, cardType),
        cardholderName: validateCardholderName(cardholderName),
      };

      // Mark all as touched and set errors
      setTouched({ cardNumber: true, expiry: true, cvv: true, cardholderName: true });
      setCardErrors(errors);

      // Check if any errors exist
      const hasErrors = Object.values(errors).some((e) => e !== null);
      if (hasErrors) {
        const firstError = errors.cardNumber || errors.expiry || errors.cvv || errors.cardholderName;
        Alert.alert('Invalid Card Details', firstError || 'Please check your card information.');
        return;
      }
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
  }, [id, method, isMockCard, receiptFile, router, cardNumber, expiry, cvv, cardholderName]);

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

  // Card type detection for UI
  const cardType = detectCardType(cardNumber);

  // Validity states for visual feedback
  const isCardNumberValid = touched.cardNumber && !cardErrors.cardNumber && cardNumber.length > 0;
  const isExpiryValid = touched.expiry && !cardErrors.expiry && expiry.length > 0;
  const isCvvValid = touched.cvv && !cardErrors.cvv && cvv.length > 0;
  const isCardholderNameValid =
    touched.cardholderName && !cardErrors.cardholderName && cardholderName.length > 0;

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

            {/* Card Number */}
            <View style={styles.cardFieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Card Number</Text>
              <View
                style={[
                  styles.cardField,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: isCardNumberValid
                      ? theme.success
                      : touched.cardNumber && cardErrors.cardNumber
                      ? theme.inputErrorBorder
                      : theme.inputBorder,
                  },
                ]}
              >
                <Ionicons name="card-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.cardFieldInput, { color: theme.inputText }]}
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  onEndEditing={handleCardNumberBlur}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="number-pad"
                  maxLength={19}
                />
                {isCardNumberValid && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.success}
                    style={styles.validIcon}
                  />
                )}
              </View>
              {/* Card type indicator */}
              {cardType ? (
                <Text style={[styles.cardTypeIndicator, { color: theme.textTertiary }]}>
                  {cardType}
                </Text>
              ) : null}
              {/* Error text */}
              {touched.cardNumber && cardErrors.cardNumber ? (
                <Text style={[styles.cardFieldError, { color: theme.error }]}>
                  {cardErrors.cardNumber}
                </Text>
              ) : null}
            </View>

            {/* Expiry and CVV Row */}
            <View style={styles.cardRow}>
              {/* Expiry */}
              <View style={[styles.cardFieldHalf, { marginRight: spacing.sm }]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Expiry</Text>
                <View
                  style={[
                    styles.cardField,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: isExpiryValid
                        ? theme.success
                        : touched.expiry && cardErrors.expiry
                        ? theme.inputErrorBorder
                        : theme.inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.cardFieldInput, { color: theme.inputText }]}
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    onEndEditing={handleExpiryBlur}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                  {isExpiryValid && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.success}
                      style={styles.validIcon}
                    />
                  )}
                </View>
                {touched.expiry && cardErrors.expiry ? (
                  <Text style={[styles.cardFieldError, { color: theme.error }]}>
                    {cardErrors.expiry}
                  </Text>
                ) : null}
              </View>

              {/* CVV */}
              <View style={[styles.cardFieldHalf, { marginLeft: spacing.sm }]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>CVV</Text>
                <View
                  style={[
                    styles.cardField,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: isCvvValid
                        ? theme.success
                        : touched.cvv && cardErrors.cvv
                        ? theme.inputErrorBorder
                        : theme.inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.cardFieldInput, { color: theme.inputText }]}
                    value={cvv}
                    onChangeText={handleCvvChange}
                    onEndEditing={handleCvvBlur}
                    placeholder={cardType === 'Amex' ? '1234' : '123'}
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="number-pad"
                    maxLength={cardType === 'Amex' ? 4 : 3}
                    secureTextEntry
                  />
                  {isCvvValid && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.success}
                      style={styles.validIcon}
                    />
                  )}
                </View>
                {touched.cvv && cardErrors.cvv ? (
                  <Text style={[styles.cardFieldError, { color: theme.error }]}>
                    {cardErrors.cvv}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Cardholder Name */}
            <View style={styles.cardFieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Cardholder Name
              </Text>
              <View
                style={[
                  styles.cardField,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: isCardholderNameValid
                      ? theme.success
                      : touched.cardholderName && cardErrors.cardholderName
                      ? theme.inputErrorBorder
                      : theme.inputBorder,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.cardFieldInput, { color: theme.inputText }]}
                  value={cardholderName}
                  onChangeText={handleCardholderNameChange}
                  onEndEditing={handleCardholderNameBlur}
                  placeholder="John Doe"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="words"
                />
                {isCardholderNameValid && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.success}
                    style={styles.validIcon}
                  />
                )}
              </View>
              {touched.cardholderName && cardErrors.cardholderName ? (
                <Text style={[styles.cardFieldError, { color: theme.error }]}>
                  {cardErrors.cardholderName}
                </Text>
              ) : null}
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
  // New styles for card validation
  cardFieldError: {
    fontSize: 11,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  cardTypeIndicator: {
    fontSize: 11,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  validIcon: {
    marginLeft: spacing.xs,
  },
});
