import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { invoiceService, CreateInvoicePayload } from '@/features/billing/services/invoice.service';

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

  const [patientId, setPatientId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: CreateInvoicePayload = {
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
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create New Invoice</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Patient ID *</Text>
          <TextInput
            style={[styles.input, errors.patientId && styles.inputError]}
            value={patientId}
            onChangeText={(text) => {
              setPatientId(text);
              if (errors.patientId) setErrors({ ...errors, patientId: undefined });
            }}
            placeholder="Enter patient ID"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
          {errors.patientId && <Text style={styles.errorText}>{errors.patientId}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Total Amount ($) *</Text>
          <TextInput
            style={[styles.input, errors.totalAmount && styles.inputError]}
            value={totalAmount}
            onChangeText={(text) => {
              setTotalAmount(text);
              if (errors.totalAmount) setErrors({ ...errors, totalAmount: undefined });
            }}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />
          {errors.totalAmount && <Text style={styles.errorText}>{errors.totalAmount}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Appointment ID (optional)</Text>
          <TextInput
            style={styles.input}
            value={appointmentId}
            onChangeText={setAppointmentId}
            placeholder="Enter appointment ID if applicable"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Invoice</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors[colorScheme].background },
  card: {
    backgroundColor: Colors[colorScheme].surface,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors[colorScheme].text, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors[colorScheme].textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors[colorScheme].inputBackground,
    borderWidth: 1,
    borderColor: Colors[colorScheme].inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors[colorScheme].inputText,
  },
  inputError: { borderColor: Colors[colorScheme].inputError },
  errorText: { color: Colors[colorScheme].error, fontSize: 12, marginTop: 4 },
  submitButton: {
    backgroundColor: Colors[colorScheme].primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: { color: Colors[colorScheme].textSecondary, fontWeight: '600', fontSize: 16 },
});