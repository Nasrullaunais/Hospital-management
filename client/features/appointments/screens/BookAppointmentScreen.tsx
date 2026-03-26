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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { appointmentService } from '../services/appointment.service';

export default function BookAppointmentScreen() {
  const { doctorId: paramDoctorId } = useLocalSearchParams<{ doctorId?: string }>();
  const router = useRouter();

  const [doctorId] = useState(paramDoctorId ?? '');
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Preserve the current time when changing the date
      const updated = new Date(selectedDate);
      updated.setHours(date.getHours(), date.getMinutes());
      setDate(updated);
      // On Android, show time picker right after date picker
      if (Platform.OS === 'android') {
        setTimeout(() => setShowTimePicker(true), 300);
      }
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const updated = new Date(date);
      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDate(updated);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleBook = async () => {
    if (!doctorId.trim()) {
      Alert.alert('Validation', 'Doctor is required.');
      return;
    }

    if (date <= new Date()) {
      Alert.alert('Validation', 'Appointment date must be in the future.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('doctorId', doctorId.trim());
      formData.append('appointmentDate', date.toISOString());
      if (reason.trim()) {
        formData.append('reasonForVisit', reason.trim());
      }

      if (selectedFile) {
        formData.append('referralDocument', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType ?? 'application/octet-stream',
        } as any);
      }

      await appointmentService.bookAppointment(formData);
      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to book appointment. Please try again.';
      Alert.alert('Booking Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Book Appointment</Text>

        {/* Doctor ID (pre-filled, read-only when from navigation) */}
        <Text style={styles.label}>Doctor ID</Text>
        <TextInput
          style={[styles.input, paramDoctorId ? styles.inputDisabled : undefined]}
          placeholder="Enter doctor ID"
          value={doctorId}
          editable={false}
          autoCapitalize="none"
        />

        {/* Date Picker */}
        <Text style={styles.label}>Appointment Date & Time *</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 1, marginRight: 8 }]}
            onPress={() => setShowDatePicker(true)}
            disabled={loading}
          >
            <Text style={styles.dateButtonText}>📅 {formattedDate}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateButton, { width: 110 }]}
            onPress={() => setShowTimePicker(true)}
            disabled={loading}
          >
            <Text style={styles.dateButtonText}>🕐 {formattedTime}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        {/* Reason for Visit */}
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

        {/* Referral Document Picker */}
        <Text style={styles.label}>Referral Document (optional)</Text>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={pickDocument}
          disabled={loading}
        >
          <Text style={styles.pickButtonText}>
            {selectedFile ? selectedFile.name : 'Select PDF or Image'}
          </Text>
        </TouchableOpacity>
        {selectedFile && (
          <View style={styles.fileInfo}>
            <Text style={styles.fileHint}>
              {selectedFile.mimeType} — {((selectedFile.size ?? 0) / 1024).toFixed(1)} KB
            </Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Text style={styles.removeFile}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

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
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#888' },
  textArea: { height: 100, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', marginBottom: 16 },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  dateButtonText: { fontSize: 14, color: '#1a1a2e' },
  pickButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    marginBottom: 8,
  },
  pickButtonText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileHint: { color: '#888', fontSize: 12 },
  removeFile: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
