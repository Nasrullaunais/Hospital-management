import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { invoiceService, ValidCreateInvoicePayload } from '@/features/billing/services/invoice.service';

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [patientId, setPatientId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<{ patientId?: string; totalAmount?: string }>({});

  const validate = () => {
    const newErrors: { patientId?: string; totalAmount?: string } = {};

    if (!patientId.trim()) {
      newErrors.patientId = 'Patient ID is required';
    }

    const amount = parseFloat(totalAmount);
    if (!totalAmount || isNaN(amount) || amount <= 0) {
      newErrors.totalAmount = 'Enter a valid amount greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setValidating(true);
    if (!validate()) {
      setValidating(false);
      return;
    }
    setValidating(false);

    setLoading(true);
    try {
      const payload: ValidCreateInvoicePayload = {
        patientId: patientId.trim(),
        totalAmount: parseFloat(totalAmount),
        appointmentId: appointmentId.trim() || undefined,
      };

      await invoiceService.createInvoice(payload);
      Alert.alert('Success', 'Invoice created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          Create New Invoice
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
          Generate a new invoice for a patient.
        </Text>

        {/* Invoice Details Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
            ...shadows.card,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: spacing.md,
            }}
          >
            INVOICE DETAILS
          </Text>

          <Input
            label="Patient ID *"
            placeholder="Enter patient ID"
            value={patientId}
            onChangeText={(text) => {
              setPatientId(text);
              if (errors.patientId) setErrors({ ...errors, patientId: undefined });
            }}
            error={errors.patientId}
            autoCapitalize="none"
          />

          <Input
            label="Total Amount *"
            placeholder="0.00"
            value={totalAmount}
            onChangeText={(text) => {
              setTotalAmount(text);
              if (errors.totalAmount) setErrors({ ...errors, totalAmount: undefined });
            }}
            error={errors.totalAmount}
            keyboardType="decimal-pad"
          />

          <Input
            label="Appointment ID (Optional)"
            placeholder="Enter appointment ID if applicable"
            value={appointmentId}
            onChangeText={setAppointmentId}
            autoCapitalize="none"
          />
        </View>

        <Button
          title="Create Invoice"
          variant="accent"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleSubmit}
          style={{ marginTop: spacing.lg }}
        />

        <Button
          title="Cancel"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => router.back()}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
