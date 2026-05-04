import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  FlatList,
  Modal,
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
import { doctorService } from '@/features/doctors/services/doctor.service';
import type { Doctor } from '@/shared/types';

/**
 * Build a UTC Date from a selected slot. The server treats schedule times as UTC,
 * so we must send appointmentDate as a UTC ISO string matching the slot time.
 */
function buildSlotDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00.000Z`);
}

export default function BookAppointmentScreen() {
  const { doctorId: paramDoctorId, date: paramDate, time: paramTime } =
    useLocalSearchParams<{ doctorId?: string; date?: string; time?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Pre-construct slot date from navigation params (if user came from DoctorScheduleCalendar)
  const preselectedSlotDate = useMemo(
    () => (paramDate && paramTime ? buildSlotDate(paramDate, paramTime) : null),
    [paramDate, paramTime],
  );

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const [doctorId, setDoctorId] = useState(paramDoctorId ?? '');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [date, setDate] = useState(preselectedSlotDate ?? new Date(Date.now() + MS_PER_DAY));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch doctor details and set selectedDoctor when doctorId param is provided
  useEffect(() => {
    if (paramDoctorId) {
      doctorService
        .getDoctorById(paramDoctorId)
        .then((doc) => setSelectedDoctor(doc))
        .catch((err: unknown) => console.warn('Failed to pre-load doctor details:', err));
    }
  }, [paramDoctorId]);

  // Fetch doctors for picker
  const fetchDoctors = useCallback(async () => {
    try {
      setLoadingDoctors(true);
      const data = await doctorService.getDoctors({ availability: 'Available' });
      setDoctors(data);
    } catch (err: unknown) {
      console.error('fetchDoctors failed:', err);
      Alert.alert('Error', 'Failed to load doctors. Please try again.');
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const handleOpenDoctorPicker = () => {
    fetchDoctors();
    setShowDoctorPicker(true);
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setDoctorId(doctor._id);
    setSelectedDoctor(doctor);
    setShowDoctorPicker(false);
  };

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
    } catch (err: unknown) {
      console.error('pickDocument failed:', err);
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

    // Build a UTC-stable ISO string from the selected slot time.
    // The server treats schedule times as UTC, so appointmentDate MUST be a UTC
    // ISO string whose hours/minutes match the slot time.
    let appointmentISO: string;
    if (preselectedSlotDate) {
      appointmentISO = preselectedSlotDate.toISOString();
    } else {
      // Fallback: strip local-timezone offset by constructing from UTC parts
      appointmentISO = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          date.getUTCHours(),
          date.getUTCMinutes(),
          0,
        ),
      ).toISOString();
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('doctorId', doctorId.trim());
      formData.append('appointmentDate', appointmentISO);
      if (reason.trim()) {
        formData.append('reasonForVisit', reason.trim());
      }

      if (selectedFile) {
        formData.append('referralDocument', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }

      await appointmentService.bookAppointment(formData);
      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
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
            <Text style={[styles.label, { color: colors.text }]}>Doctor *</Text>
            {paramDoctorId && selectedDoctor ? (
              <View style={[styles.readOnlyInput, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                <Feather name="check-circle" size={16} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.readOnlyText, { color: colors.success }]}>
                  Dr. {selectedDoctor.userId?.name || 'Selected'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.doctorPickerButton, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                onPress={handleOpenDoctorPicker}
                disabled={loading}
              >
                <Feather name="search" size={16} color={colors.textTertiary} />
                <Text style={[styles.doctorPickerText, { color: colors.textSecondary }]}>
                  {selectedDoctor ? `Dr. ${selectedDoctor.userId?.name || 'Selected'}` : 'Select a doctor'}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Appointment Date & Time *</Text>
            {preselectedSlotDate ? (
              <View style={[styles.slotConfirmed, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                <Feather name="check-circle" size={16} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.slotConfirmedText, { color: colors.success }]}>
                  {paramDate} at {paramTime}
                </Text>
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>

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
            disabled={loading || !doctorId}
            fullWidth
            style={styles.button}
          />
        </View>
      </ScrollView>

      <Modal visible={showDoctorPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Doctor</Text>
              <TouchableOpacity onPress={() => setShowDoctorPicker(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {loadingDoctors ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : (
              <FlatList
                data={doctors}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                  const doctorName = item.userId?.name || 'Unknown';
                  const isSelected = item._id === doctorId;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.doctorOption,
                        { borderColor: isSelected ? colors.primary : colors.border },
                        isSelected && { backgroundColor: colors.primaryMuted },
                      ]}
                      onPress={() => handleSelectDoctor(item)}
                    >
                      <View style={[styles.doctorAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.doctorAvatarText}>
                          {doctorName.split(' ').map((n: string) => n[0] ?? '').slice(0, 2).join('')}
                        </Text>
                      </View>
                      <View style={styles.doctorInfo}>
                        <Text style={[styles.doctorName, { color: colors.text }]}>{doctorName}</Text>
                        <Text style={[styles.doctorSpecialty, { color: colors.primary }]}>{item.specialization}</Text>
                      </View>
                      {isSelected && <Feather name="check-circle" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No available doctors found.</Text>
                }
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            )}
          </View>
        </View>
      </Modal>
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
  doctorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  doctorPickerText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  doctorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  slotConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  slotConfirmedText: {
    fontSize: 16,
    fontWeight: '500',
  },
});