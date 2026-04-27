import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { isAxiosError } from 'axios';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { recordService } from '@/features/records/services/record.service';
import { prescriptionService, type Prescription } from '@/features/prescriptions/services/prescription.service';
import { Config } from '@/shared/constants/Config';
import type { PopulatedMedicalRecord } from '@/shared/types';

export default function RecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [record, setRecord] = useState<PopulatedMedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await recordService.getRecordById(id);
      setRecord(data);
      setDiagnosis(data.diagnosis ?? '');
      setPrescription(data.prescription ?? '');

      setLoadingPrescriptions(true);
      try {
        const rxData = await prescriptionService.getPrescriptionsByRecordId(id);
        setPrescriptions(rxData);
      } catch {
        setPrescriptions([]);
      } finally {
        setLoadingPrescriptions(false);
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setError('Record not found.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load record.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchRecord();
  }, [fetchRecord]);

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await recordService.updateRecord(id, { diagnosis, prescription });
      setEditing(false);
      await fetchRecord();
    } catch (err) {
      if (err instanceof Error) {
        Alert.alert('Error', err.message);
      } else {
        Alert.alert('Error', 'Failed to save record.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      'Only administrators can delete medical records. Please contact an admin for assistance.',
    );
  };

  const openLabReport = async (labReportUrl: string) => {
    const fullUrl = `${Config.BASE_URL}${labReportUrl}`;
    const supported = await Linking.canOpenURL(fullUrl);
    if (supported) {
      await Linking.openURL(fullUrl);
    } else {
      Alert.alert('Cannot Open File', 'No app available to open this file type.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Record Details', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerShadowVisible: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Record Details', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerShadowVisible: false }} />
        <View style={styles.centered}>
          <SymbolView name={{ ios: 'exclamationmark.triangle', android: 'error', web: 'error' }} tintColor={colors.error} size={48} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return null;
  }

  const displayDate = new Date(record.dateRecorded).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Record Details',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () =>
            !editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.headerEditButton}>
                <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor={colors.primary} size={20} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={styles.dateRow}>
              <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={colors.textSecondary} size={13} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{displayDate}</Text>
            </View>
          </View>

          <View style={styles.subLabelRow}>
            <SymbolView name={{ ios: 'person', android: 'person', web: 'person' }} tintColor={colors.primary} size={16} />
            <Text style={[styles.subLabel, { color: colors.primary }]}>{record.patientId.name}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <View style={styles.subLabelRow}>
            <SymbolView name={{ ios: 'stethoscope', android: 'medical_services', web: 'medical_services' }} tintColor={colors.textSecondary} size={16} />
            <Text style={[styles.doctorLabel, { color: colors.textSecondary }]}>
              Dr. {record.doctorId.userId.name} · {record.doctorId.specialization}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="Enter diagnosis"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          ) : (
            <Text style={[styles.sectionValue, { color: colors.text }]}>{record.diagnosis}</Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Prescription</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={prescription}
              onChangeText={setPrescription}
              placeholder="Enter prescription"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          ) : prescriptions.length > 0 ? (
            <View style={styles.prescriptionList}>
              {prescriptions.map((rx, rxIndex) => (
                <View key={rx._id ?? rxIndex} style={rxIndex > 0 ? { marginTop: 16 } : undefined}>
                  {rx.items.map((item, itemIndex) => (
                    <View key={itemIndex} style={[styles.rxItem, { backgroundColor: colors.surfaceTertiary ?? colors.background }]}>
                      <View style={styles.rxItemHeader}>
                        <SymbolView name={{ ios: 'pills', android: 'medication', web: 'medication' }} tintColor={colors.primary} size={16} />
                        <Text style={[styles.rxItemName, { color: colors.text }]}>{item.medicineName}</Text>
                      </View>
                      <Text style={[styles.rxItemDetail, { color: colors.textSecondary }]}>
                        {item.dosage} — Qty: {item.quantity}
                      </Text>
                      {item.instructions ? (
                        <Text style={[styles.rxItemInstructions, { color: colors.textTertiary }]}>{item.instructions}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.sectionValue, { color: colors.text }]}>
              {record.prescription ?? 'No prescription recorded.'}
            </Text>
          )}
        </View>

        {record.labReportUrl ? (
          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: colors.infoBg, borderColor: colors.info }]}
            onPress={() => void openLabReport(record.labReportUrl!)}
          >
            <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} tintColor={colors.info} size={16} />
            <Text style={[styles.reportButtonText, { color: colors.info }]}>View Lab Report</Text>
          </TouchableOpacity>
        ) : null}

        {editing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setDiagnosis(record.diagnosis ?? '');
                setPrescription(record.prescription ?? '');
                setEditing(false);
              }}
              disabled={saving}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {!editing ? (
          <TouchableOpacity style={styles.deleteHint} onPress={handleDelete}>
            <Text style={[styles.deleteHintText, { color: colors.textTertiary }]}>
              Need to delete this record? Contact an administrator.
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const TAB_BAR_HEIGHT = 70;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  headerEditButton: {
    padding: 8,
  },
  content: {
    padding: 16,
    paddingBottom: TAB_BAR_HEIGHT + 24,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  doctorLabel: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  reportButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  deleteHint: {
    alignItems: 'center',
    marginTop: 8,
  },
  deleteHintText: {
    fontSize: 13,
  },
  prescriptionList: {
    gap: 8,
  },
  rxItem: {
    borderRadius: 10,
    padding: 12,
  },
  rxItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rxItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  rxItemDetail: {
    fontSize: 13,
    marginLeft: 24,
  },
  rxItemInstructions: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 24,
    marginTop: 2,
  },
});
