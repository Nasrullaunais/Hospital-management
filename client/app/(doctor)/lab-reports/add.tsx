import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { APPOINTMENT_STATUS } from '@/shared/constants/appointmentStatus';
import { labReportService } from '@/features/records/services/labReport.service';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Button } from '@/components/ui';
import type { ApiSuccessResponse, Appointment, User, LabType, LabResultFlag } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

type PatientOption = {
  appointmentId: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  status: string;
};

interface ResultEntry {
  parameter: string;
  value: string;
  unit: string;
  normalRange: string;
  flag: LabResultFlag;
}

const LAB_TYPES: { key: LabType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'hematology', label: 'Hematology', icon: 'droplet' },
  { key: 'biochemistry', label: 'Biochemistry', icon: 'trending-up' },
  { key: 'microbiology', label: 'Microbiology', icon: 'search' },
  { key: 'urinalysis', label: 'Urinalysis', icon: 'eye' },
  { key: 'radiology', label: 'Radiology', icon: 'monitor' },
  { key: 'serology', label: 'Serology', icon: 'activity' },
  { key: 'pathology', label: 'Pathology', icon: 'crosshair' },
  { key: 'other', label: 'Other', icon: 'more-horizontal' },
];

const FLAG_OPTIONS: { key: LabResultFlag; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'high', label: 'High' },
  { key: 'low', label: 'Low' },
  { key: 'critical', label: 'Critical' },
];

export default function AddLabReportScreen() {
  const router = useRouter();
  const { patientId: initialPatientId } = useLocalSearchParams<{ patientId?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [labType, setLabType] = useState<LabType | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([
    { parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' },
  ]);
  const [interpretation, setInterpretation] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[] }>>(
          ENDPOINTS.APPOINTMENTS.MY_DOCTOR_SCHEDULE,
        );
        const appointments = res.data.data.appointments;
        const seen = new Set<string>();
        const options: PatientOption[] = [];

        for (const appt of appointments) {
          if (appt.status === APPOINTMENT_STATUS.CANCELLED) continue;
          const patient = appt.patientId;
          if (typeof patient !== 'object' || !patient || !('_id' in patient)) {
            continue;
          }
          const user = patient as User;
          if (seen.has(user._id)) continue;
          seen.add(user._id);
          options.push({
            appointmentId: appt._id,
            patientId: user._id,
            patientName: user.name,
            appointmentDate: appt.appointmentDate,
            status: appt.status,
          });
        }

        setPatients(options);

        if (initialPatientId) {
          const match = options.find(p => p.patientId === initialPatientId);
          if (match) setSelectedPatient(match);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load appointments.';
        Alert.alert('Error', message);
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  const addResult = () => {
    setResults(prev => [
      ...prev,
      { parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' },
    ]);
  };

  const removeResult = (index: number) => {
    setResults(prev => prev.filter((_, i) => i !== index));
  };

  const updateResult = (index: number, field: keyof ResultEntry, value: string | LabResultFlag) => {
    setResults(prev =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Validation', 'Please select a patient.');
      return;
    }
    if (!labType) {
      Alert.alert('Validation', 'Please select a lab type.');
      return;
    }
    if (results.length === 0) {
      Alert.alert('Validation', 'Add at least one test result.');
      return;
    }
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.parameter.trim() || !r.value || !r.unit.trim()) {
        Alert.alert(
          'Validation',
          `Result ${i + 1} is incomplete. Parameter, value, and unit are required.`,
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await labReportService.createLabReport({
        patientId: selectedPatient.patientId,
        labType,
        results: results.map(r => ({
          parameter: r.parameter.trim(),
          value: Number(r.value),
          unit: r.unit.trim(),
          normalRange: r.normalRange?.trim() || undefined,
          flag: r.flag || 'normal',
        })),
        interpretation: interpretation.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', 'Lab report created.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create lab report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPatients) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading patients…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Patient Selection */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Select Patient
          </Text>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            {patients.length === 0 ? (
              <View style={styles.hintBox}>
                <Feather name="alert-circle" size={20} color={colors.warning} />
                <View style={styles.hintContent}>
                  <Text style={[styles.hintTitle, { color: colors.text }]}>
                    No patients available
                  </Text>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    You need pending or confirmed appointments before creating lab reports.
                  </Text>
                </View>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.patientScrollContent}
              >
                {patients.map(p => {
                  const isSelected = selectedPatient?.patientId === p.patientId;
                  const statusColor =
                    p.status === APPOINTMENT_STATUS.CONFIRMED
                      ? colors.success
                      : p.status === APPOINTMENT_STATUS.COMPLETED
                        ? colors.textSecondary
                        : p.status === APPOINTMENT_STATUS.PENDING
                          ? colors.warning
                          : colors.textSecondary;
                  const formattedDate = new Date(p.appointmentDate).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  );
                  return (
                    <TouchableOpacity
                      key={p.patientId}
                      style={[
                        styles.patientChip,
                        isSelected
                          ? {
                              backgroundColor: colors.primaryMuted,
                              borderColor: colors.primary,
                            }
                          : {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                      ]}
                      onPress={() => setSelectedPatient(p)}
                    >
                      <View
                        style={[
                          styles.chipAvatar,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.textTertiary,
                          },
                        ]}
                      >
                        <Text style={styles.chipAvatarText}>
                          {p.patientName
                            .split(' ')
                            .map(n => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.patientChipContent}>
                        <Text
                          style={[
                            styles.patientChipText,
                            { color: isSelected ? colors.primary : colors.text },
                          ]}
                        >
                          {p.patientName}
                        </Text>
                        <View style={styles.patientChipMeta}>
                          <View
                            style={[styles.statusDot, { backgroundColor: statusColor }]}
                          />
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {p.status}
                          </Text>
                          <Text
                            style={[styles.appointmentDate, { color: colors.textTertiary }]}
                          >
                            {formattedDate}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Lab Type Selection */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Lab Type
          </Text>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            <View style={styles.labTypeGrid}>
              {LAB_TYPES.map(lt => {
                const isSelected = labType === lt.key;
                return (
                  <TouchableOpacity
                    key={lt.key}
                    style={[
                      styles.labTypeChip,
                      isSelected
                        ? {
                            backgroundColor: colors.primary,
                            borderColor: colors.primary,
                          }
                        : {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                    ]}
                    onPress={() => setLabType(lt.key)}
                  >
                    <Feather
                      name={lt.icon}
                      size={16}
                      color={isSelected ? '#fff' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.labTypeChipText,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      {lt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Test Results */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Test Results
          </Text>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            {results.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultRowContainer,
                  index < results.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.divider,
                    paddingBottom: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <View style={styles.resultRowHeader}>
                  <Text style={[styles.resultIndex, { color: colors.textSecondary }]}>
                    Result #{index + 1}
                  </Text>
                  {results.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeResult(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x-circle" size={22} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.resultFieldsRow}>
                  <View style={styles.resultFieldHalf}>
                    <Text
                      style={[styles.resultFieldLabel, { color: colors.textTertiary }]}
                    >
                      Parameter
                    </Text>
                    <TextInput
                      style={[
                        styles.resultInput,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                        },
                      ]}
                      placeholder="e.g. WBC"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={result.parameter}
                      onChangeText={v => updateResult(index, 'parameter', v)}
                    />
                  </View>
                  <View style={styles.resultFieldSmall}>
                    <Text
                      style={[styles.resultFieldLabel, { color: colors.textTertiary }]}
                    >
                      Value
                    </Text>
                    <TextInput
                      style={[
                        styles.resultInput,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                        },
                      ]}
                      placeholder="0.0"
                      placeholderTextColor={colors.inputPlaceholder}
                      keyboardType="decimal-pad"
                      value={result.value}
                      onChangeText={v => updateResult(index, 'value', v)}
                    />
                  </View>
                  <View style={styles.resultFieldSmall}>
                    <Text
                      style={[styles.resultFieldLabel, { color: colors.textTertiary }]}
                    >
                      Unit
                    </Text>
                    <TextInput
                      style={[
                        styles.resultInput,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                        },
                      ]}
                      placeholder="x10⁹/L"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={result.unit}
                      onChangeText={v => updateResult(index, 'unit', v)}
                    />
                  </View>
                </View>

                <View style={styles.resultFieldsRow}>
                  <View style={styles.resultFieldHalf}>
                    <Text
                      style={[styles.resultFieldLabel, { color: colors.textTertiary }]}
                    >
                      Normal Range
                    </Text>
                    <TextInput
                      style={[
                        styles.resultInput,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                        },
                      ]}
                      placeholder="e.g. 4.0-11.0"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={result.normalRange}
                      onChangeText={v => updateResult(index, 'normalRange', v)}
                    />
                  </View>
                  <View style={styles.resultFieldHalf}>
                    <Text
                      style={[styles.resultFieldLabel, { color: colors.textTertiary }]}
                    >
                      Flag
                    </Text>
                    <View style={styles.flagRow}>
                      {FLAG_OPTIONS.map(fo => {
                        const isFlagSelected = result.flag === fo.key;
                        const flagColors: Record<string, string> = {
                          normal: colors.success,
                          high: colors.warning,
                          low: colors.info,
                          critical: colors.error,
                        };
                        const bgColors: Record<string, string> = {
                          normal: colors.successBg,
                          high: colors.warningBg,
                          low: colors.infoBg,
                          critical: colors.errorBg,
                        };
                        return (
                          <TouchableOpacity
                            key={fo.key}
                            style={[
                              styles.flagPill,
                              isFlagSelected
                                ? {
                                    backgroundColor: flagColors[fo.key],
                                    borderColor: flagColors[fo.key],
                                  }
                                : {
                                    backgroundColor: bgColors[fo.key] || colors.surfaceTertiary,
                                    borderColor: colors.border,
                                  },
                            ]}
                            onPress={() => updateResult(index, 'flag', fo.key)}
                          >
                            <Text
                              style={[
                                styles.flagPillText,
                                {
                                  color: isFlagSelected ? '#fff' : flagColors[fo.key],
                                  fontSize: 10,
                                },
                              ]}
                            >
                              {fo.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addResultButton, { borderColor: colors.primary }]}
              onPress={addResult}
            >
              <Feather name="plus-circle" size={18} color={colors.primary} />
              <Text style={[styles.addResultButtonText, { color: colors.primary }]}>
                Add Result
              </Text>
            </TouchableOpacity>
          </View>

          {/* Interpretation */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Interpretation
          </Text>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                },
              ]}
              placeholder="Enter clinical interpretation of results…"
              placeholderTextColor={colors.inputPlaceholder}
              value={interpretation}
              onChangeText={setInterpretation}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>

          {/* Notes */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Notes
          </Text>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                },
              ]}
              placeholder="Additional notes (optional)…"
              placeholderTextColor={colors.inputPlaceholder}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>

          {/* Submit Button */}
          <Button
            title="Create Lab Report"
            onPress={() => void handleSubmit()}
            variant="accent"
            size="lg"
            fullWidth
            loading={submitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  container: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.lg },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 20,
  },
  formCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hintContent: { flex: 1 },
  hintTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 14, lineHeight: 20 },
  patientScrollContent: { gap: 8, paddingRight: 8 },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minWidth: 200,
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  patientChipContent: { gap: 4, flex: 1 },
  patientChipText: { fontSize: 14, fontWeight: '600' },
  patientChipMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },
  appointmentDate: { fontSize: 10 },
  labTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  labTypeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultRowContainer: {},
  resultRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultIndex: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultFieldsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  resultFieldHalf: {
    flex: 1,
  },
  resultFieldSmall: {
    flex: 0.8,
  },
  resultFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  resultInput: {
    borderWidth: 1.5,
    borderRadius: radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  flagRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  flagPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  flagPillText: {
    fontWeight: '600',
  },
  addResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: 4,
  },
  addResultButtonText: { fontSize: 14, fontWeight: '600' },
  textArea: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 16,
  },
});
