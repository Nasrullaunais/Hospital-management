import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { wardReceptionistService, type BedStatus, type PatientSummary } from '@/features/wardReceptionist/services/wardReceptionist.service';
import { Input, Button } from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius } from '@/constants/ThemeTokens';

export default function AssignPatientScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [beds, setBeds] = useState<BedStatus[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [selectedBed, setSelectedBed] = useState<BedStatus | null>(null);
  const [admissionDate, setAdmissionDate] = useState(new Date());
  const [showAdmissionPicker, setShowAdmissionPicker] = useState(false);
  const [expectedDischarge, setExpectedDischarge] = useState<Date | null>(null);
  const [showDischargePicker, setShowDischargePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    patient?: string;
    bed?: string;
    admissionDate?: string;
  }>({});

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [patientsData, bedsData] = await Promise.all([
        wardReceptionistService.getPatients(''),
        wardReceptionistService.getBedStatuses(),
      ]);
      setPatients(patientsData.filter(p => !p.bedId));
      setBeds(bedsData.filter(b => b.status === 'vacant'));
    } catch {
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onAdmissionDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowAdmissionPicker(Platform.OS === 'android');
    if (selectedDate) {
      setAdmissionDate(selectedDate);
      setErrors(prev => ({ ...prev, admissionDate: undefined }));
    }
  };

  const onDischargeDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDischargePicker(Platform.OS === 'android');
    if (selectedDate) {
      setExpectedDischarge(selectedDate);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!selectedPatient) {
      newErrors.patient = 'Patient is required.';
    }
    if (!selectedBed) {
      newErrors.bed = 'Bed is required.';
    }
    if (!admissionDate) {
      newErrors.admissionDate = 'Admission date is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAssign = async () => {
    if (!validate()) return;

    if (!selectedBed?.wardId) {
      Alert.alert('Error', 'Selected bed is missing ward information. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      await wardReceptionistService.assignPatient({
        patientId: selectedPatient!._id,
        wardId: selectedBed.wardId,
        bedNumber: selectedBed.bedNumber,
        admissionDate: admissionDate.toISOString(),
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', `Patient ${selectedPatient!.name} has been assigned to bed #${selectedBed!.bedNumber}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign patient. Please try again.';
      Alert.alert('Assignment Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedAdmissionDate = admissionDate.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedDischargeDate = expectedDischarge
    ? expectedDischarge.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  if (loadingData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form} testID="assign-screen">
          {/* Patient Selector */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Patient *</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.patient ? theme.inputErrorBorder : theme.inputBorder,
                },
              ]}
              onPress={() => {
                setShowPatientPicker(true);
                setSearchQuery('');
              }}
              disabled={submitting}
              testID="patient-select"
            >
              {selectedPatient ? (
                <>
                  <Feather name="user" size={16} color={theme.success} style={{ marginRight: 8 }} />
                  <Text style={[styles.pickerButtonText, { color: theme.text }]}>{selectedPatient.name}</Text>
                </>
              ) : (
                <>
                  <Feather name="user" size={16} color={theme.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={[styles.pickerPlaceholder, { color: theme.textSecondary }]}>Select a patient</Text>
                </>
              )}
              <Feather name="chevron-down" size={16} color={theme.textTertiary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {errors.patient && (
              <Text style={[styles.errorText, { color: theme.inputError }]}>{errors.patient}</Text>
            )}
          </View>

          {/* Bed Selector */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Bed *</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.bed ? theme.inputErrorBorder : theme.inputBorder,
                },
              ]}
              onPress={() => setShowBedPicker(true)}
              disabled={submitting}
              testID="bed-select"
            >
              {selectedBed ? (
                <>
                  <Feather name="check-circle" size={16} color={theme.success} style={{ marginRight: 8 }} />
                  <Text style={[styles.pickerButtonText, { color: theme.text }]}>
                    Bed #{selectedBed.bedNumber} — {selectedBed.wardName}
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="grid" size={16} color={theme.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={[styles.pickerPlaceholder, { color: theme.textSecondary }]}>Select a vacant bed</Text>
                </>
              )}
              <Feather name="chevron-down" size={16} color={theme.textTertiary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {errors.bed && (
              <Text style={[styles.errorText, { color: theme.inputError }]}>{errors.bed}</Text>
            )}
          </View>

          {/* Admission Date */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Admission Date *</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: errors.admissionDate ? theme.inputErrorBorder : theme.inputBorder,
                },
              ]}
              onPress={() => setShowAdmissionPicker(true)}
              disabled={submitting}
              testID="admission-date"
            >
              <Feather name="calendar" size={16} color={theme.textTertiary} style={{ marginRight: 8 }} />
              <Text style={[styles.pickerButtonText, { color: theme.text }]}>{formattedAdmissionDate}</Text>
              <Feather name="chevron-down" size={16} color={theme.textTertiary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
            {errors.admissionDate && (
              <Text style={[styles.errorText, { color: theme.inputError }]}>{errors.admissionDate}</Text>
            )}
          </View>

          {/* Expected Discharge Date */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Expected Discharge Date (optional)</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                },
              ]}
              onPress={() => setShowDischargePicker(true)}
              disabled={submitting}
            >
              <Feather name="calendar" size={16} color={theme.textTertiary} style={{ marginRight: 8 }} />
              {formattedDischargeDate ? (
                <Text style={[styles.pickerButtonText, { color: theme.text }]}>{formattedDischargeDate}</Text>
              ) : (
                <Text style={[styles.pickerPlaceholder, { color: theme.textSecondary }]}>Select expected discharge date</Text>
              )}
              <Feather name="chevron-down" size={16} color={theme.textTertiary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <Input
            label="Notes (optional)"
            placeholder="Add any relevant notes about this admission..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!submitting}
          />

          {/* Submit Button */}
          <Button
            title="Assign Patient"
            onPress={handleAssign}
            loading={submitting}
            disabled={submitting}
            fullWidth
            style={styles.button}
            testID="submit-btn"
          />
        </View>
      </ScrollView>

      {/* Patient Picker Modal */}
      <Modal visible={showPatientPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Patient</Text>
              <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchContainer, { borderColor: theme.border }]}>
              <Feather name="search" size={16} color={theme.textTertiary} />
              <Input
                placeholder="Search patients..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerStyle={{ marginBottom: 0, flex: 1 }}
                autoCapitalize="none"
              />
            </View>
            {filteredPatients.length === 0 ? (
              <View style={styles.emptyModal}>
                <Feather name="users" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyModalText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'No patients match your search.' : 'No unassigned patients available.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredPatients}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedPatient(item);
                      setShowPatientPicker(false);
                      setErrors(prev => ({ ...prev, patient: undefined }));
                    }}
                  >
                    <View style={styles.listItemIcon}>
                      <Feather name="user" size={18} color={theme.primary} />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={[styles.listItemTitle, { color: theme.text }]}>{item.name}</Text>
                      {item.phone && (
                        <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>{item.phone}</Text>
                      )}
                      {item.diagnosis && (
                        <Text style={[styles.listItemSubtitle, { color: theme.textTertiary }]} numberOfLines={1}>
                          {item.diagnosis}
                        </Text>
                      )}
                    </View>
                    {selectedPatient?._id === item._id && (
                      <Feather name="check-circle" size={18} color={theme.success} />
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 400 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Bed Picker Modal */}
      <Modal visible={showBedPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Bed</Text>
              <TouchableOpacity onPress={() => setShowBedPicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {beds.length === 0 ? (
              <View style={styles.emptyModal}>
                <Feather name="grid" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyModalText, { color: theme.textSecondary }]}>
                  No vacant beds available.
                </Text>
              </View>
            ) : (
              <FlatList
                data={beds}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedBed(item);
                      setShowBedPicker(false);
                      setErrors(prev => ({ ...prev, bed: undefined }));
                    }}
                  >
                    <View style={[styles.listItemIcon, { backgroundColor: theme.successBg }}>
                      <Feather name="check-circle" size={18} color={theme.success} />
                    </View>
                    <View style={styles.listItemContent}>
                      <Text style={[styles.listItemTitle, { color: theme.text }]}>
                        Bed #{item.bedNumber}
                      </Text>
                      <Text style={[styles.listItemSubtitle, { color: theme.textSecondary }]}>
                        {item.wardName}
                      </Text>
                    </View>
                    {selectedBed?._id === item._id && (
                      <Feather name="check-circle" size={18} color={theme.success} />
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 400 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showAdmissionPicker && (
        <DateTimePicker
          value={admissionDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onAdmissionDateChange}
        />
      )}

      {showDischargePicker && (
        <DateTimePicker
          value={expectedDischarge ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={admissionDate}
          onChange={onDischargeDateChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: spacing.xs,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  pickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  pickerPlaceholder: {
    fontSize: 16,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  emptyModal: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyModalText: {
    fontSize: 15,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  listItemContent: {
    flex: 1,
    gap: 2,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: 13,
  },
});
