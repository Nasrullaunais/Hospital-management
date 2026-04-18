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
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Input, Button } from '@/components/ui';
import { spacing, radius } from '@/constants/ThemeTokens';
import { appointmentService } from '../services/appointment.service';

export default function BookAppointmentScreen() {
  const { doctorId: paramDoctorId } = useLocalSearchParams<{ doctorId?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [doctorId] = useState(paramDoctorId ?? '');
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const updated = new Date(selectedDate);
      updated.setHours(date.getHours(), date.getMinutes());
      setDate(updated);
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
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Book Appointment</Text>

        <View style={styles.form}>
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Doctor ID</Text>
            <View
              style={[
                styles.readOnlyInput,
                { backgroundColor: colors.inputDisabled, borderColor: colors.inputBorder }
              ]}
            >
              <Text style={[styles.readOnlyText, { color: colors.inputDisabledText }]}>
                {doctorId || 'Not specified'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Appointment Date & Time *</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                onPress={() => setShowDatePicker(true)}
                disabled={loading}
              >
                <Feather name="calendar" size={16} color={colors.textTertiary} />
                <Text style={[styles.dateButtonText, { color: colors.text }]}>{formattedDate}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateButton, { width: 110, backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                onPress={() => setShowTimePicker(true)}
                disabled={loading}
              >
                <Feather name="clock" size={16} color={colors.textTertiary} />
                <Text style={[styles.dateButtonText, { color: colors.text }]}>{formattedTime}</Text>
              </TouchableOpacity>
            </View>
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

          <Input
            label="Reason for Visit"
            placeholder="Describe your symptoms or reason for visit..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Referral Document (optional)</Text>
            <TouchableOpacity
              style={[styles.pickButton, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
              onPress={pickDocument}
              disabled={loading}
            >
              <Feather name="upload" size={16} color={colors.primary} />
              <Text style={[styles.pickButtonText, { color: colors.primary }]}>
                {selectedFile ? selectedFile.name : 'Select PDF or Image'}
              </Text>
            </TouchableOpacity>
            {selectedFile && (
              <View style={styles.fileInfo}>
                <Text style={[styles.fileHint, { color: colors.textSecondary }]}>
                  {selectedFile.mimeType} — {((selectedFile.size ?? 0) / 1024).toFixed(1)} KB
                </Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Text style={[styles.removeFile, { color: colors.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Button
            title="Book Appointment"
            onPress={handleBook}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  fieldContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  readOnlyInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  readOnlyText: {
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateButtonText: {
    fontSize: 14,
  },
  pickButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pickButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  fileHint: {
    fontSize: 12,
  },
  removeFile: {
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    marginTop: spacing.md,
  },
});