import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  appointmentService,
  type BookAppointmentPayload,
} from '../services/appointment.service';

interface Props {
  /** Pre-fill the doctor when navigating from DoctorDetailScreen. */
  preselectedDoctorId?: string;
  onSuccess?: () => void;
}

/**
 * BookAppointmentScreen — Member 3
 * Form to book a new appointment with a doctor.
 * TODO: Replace doctorId TextInput with a doctor picker (list from DoctorListScreen).
 * TODO: Replace date TextInput with a proper DateTimePicker.
 * TODO: Add referral document upload via expo-document-picker.
 */
export default function BookAppointmentScreen({ preselectedDoctorId, onSuccess }: Props) {
  const [doctorId, setDoctorId] = useState(preselectedDoctorId ?? '');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBook = async () => {
    if (!doctorId.trim() || !date.trim()) {
      Alert.alert('Validation', 'Doctor ID and appointment date are required.');
      return;
    }

    const payload: BookAppointmentPayload = {
      doctorId: doctorId.trim(),
      appointmentDate: date.trim(),
      reasonForVisit: reason.trim() || undefined,
    };

    try {
      setLoading(true);
      await appointmentService.bookAppointment(payload);
      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to book appointment. Please try again.';
      Alert.alert('Booking Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Book Appointment</Text>

        <Text style={styles.label}>Doctor ID *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter doctor ID"
          value={doctorId}
          onChangeText={setDoctorId}
          editable={!preselectedDoctorId && !loading}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Appointment Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DDTHH:MM (e.g. 2025-08-15T09:00)"
          value={date}
          onChangeText={setDate}
          editable={!loading}
        />

        <Text style={styles.label}>Reason for Visit</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your symptoms or reason for visit..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          editable={!loading}
        />

        {/* TODO: Add referral document picker here */}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleBook}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Book Appointment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
