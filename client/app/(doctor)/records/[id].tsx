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
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { isAxiosError } from 'axios';
import * as WebBrowser from 'expo-web-browser';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { recordService } from '@/features/records/services/record.service';
import { prescriptionService, type Prescription } from '@/features/prescriptions/services/prescription.service';
import { Config } from '@/shared/constants/Config';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Badge, Button } from '@/components/ui';
import type { PopulatedMedicalRecord } from '@/shared/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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
  const [generatingCert, setGeneratingCert] = useState(false);
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

  const generateCertificate = async (restFrom?: string, restTo?: string) => {
    if (!id) return;
    try {
      setGeneratingCert(true);
      const { reportService } = await import('@/features/records/services/report.service');
      const result = await reportService.generateMedicalCertificate(id, restFrom, restTo);
      const url = result.downloadUrl.startsWith('http')
        ? result.downloadUrl
        : `${Config.BASE_URL}${result.downloadUrl}`;
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate certificate.';
      Alert.alert('Error', message);
    } finally {
      setGeneratingCert(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Record Info', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary, headerTitleStyle: { fontWeight: '600', fontSize: 16 }, headerShadowVisible: false, headerBackTitleVisible: false }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Record Info', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary, headerTitleStyle: { fontWeight: '600', fontSize: 16 }, headerShadowVisible: false, headerBackTitleVisible: false }} />
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={48} color={colors.error} />
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
  const initials = getInitials(record.patientId.name);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Record Info',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerRight: () =>
            !editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.headerEditButton}>
                <Feather name="edit-2" size={20} color={colors.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.patientName, { color: colors.text }]}>{record.patientId.name}</Text>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={13} color={colors.textTertiary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{displayDate}</Text>
            </View>
          </View>
          <Badge label="Record" variant="primary" size="sm" />
        </View>

        {/* Doctor Info */}
        <View style={[styles.doctorRow, { backgroundColor: colors.surfaceTertiary }]}>
          <Feather name="stethoscope" size={14} color={colors.textSecondary} />
          <Text style={[styles.doctorName, { color: colors.textSecondary }]}>
            Dr. {record.doctorId.userId.name} · {record.doctorId.specialization}
          </Text>
        </View>

        {/* Diagnosis Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
          {editing ? (
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="Enter diagnosis"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          ) : (
            <Text style={[styles.cardValue, { color: colors.text }]}>{record.diagnosis}</Text>
          )}
        </View>

        {/* Prescription Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Prescription</Text>
          {editing ? (
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={prescription}
              onChangeText={setPrescription}
              placeholder="Enter prescription"
              placeholderTextColor={colors.textTertiary}
              multiline
            />
          ) : prescriptions.length > 0 ? (
            <View style={styles.prescriptionList}>
              {prescriptions.map((rx, rxIndex) => (
                <View key={rx._id ?? rxIndex} style={rxIndex > 0 ? { marginTop: spacing.md } : undefined}>
                  {rx.items.map((item, itemIndex) => (
                    <View key={itemIndex} style={[styles.rxItem, { backgroundColor: colors.primaryMuted }]}>
                      <View style={styles.rxItemHeader}>
                        <Feather name="activity" size={16} color={colors.primary} />
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
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {record.prescription ?? 'No prescription recorded.'}
            </Text>
          )}
        </View>

        {/* Report Actions */}
        <View style={styles.reportSection}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Report Actions</Text>

          {/* Generate Medical Certificate */}
          <TouchableOpacity
            style={[styles.reportActionButton, { backgroundColor: colors.successBg || '#E6F5EC', borderColor: colors.success || '#1A8C4E' }]}
            onPress={() => {
              Alert.alert(
                'Medical Certificate',
                'Generate a medical certificate for this visit?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Generate', onPress: () => generateCertificate(undefined, undefined) },
                ]
              );
            }}
            disabled={generatingCert}
          >
            {generatingCert ? (
              <ActivityIndicator size="small" color={colors.success || '#1A8C4E'} />
            ) : (
              <Feather name="file-text" size={16} color={colors.success || '#1A8C4E'} />
            )}
            <Text style={[styles.reportActionText, { color: colors.success || '#1A8C4E' }]}>
              {generatingCert ? 'Generating...' : 'Generate Medical Certificate'}
            </Text>
          </TouchableOpacity>

          {/* View Uploaded Lab Report (if exists) */}
          {record.labReportUrl ? (
            <TouchableOpacity
              style={[styles.reportActionButton, { backgroundColor: colors.infoBg, borderColor: colors.info }]}
              onPress={() => void openLabReport(record.labReportUrl!)}
            >
              <Feather name="file-text" size={16} color={colors.info} />
              <Text style={[styles.reportActionText, { color: colors.info }]}>View Uploaded Lab Report</Text>
            </TouchableOpacity>
          ) : null}

          {/* Add Lab Report for this Patient */}
          <TouchableOpacity
            style={[styles.reportActionButton, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
            onPress={() => router.push(`/(doctor)/lab-reports/add?patientId=${record.patientId._id}&patientName=${encodeURIComponent(record.patientId.name)}`)}
          >
            <Feather name="plus-circle" size={16} color={colors.primary} />
            <Text style={[styles.reportActionText, { color: colors.primary }]}>Add Lab Report for Patient</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Actions */}
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

        {/* Delete Hint */}
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerEditButton: {
    padding: 8,
  },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.lg,
    gap: 12,
  },
  profileCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
  },
  doctorName: {
    fontSize: 13,
    flex: 1,
  },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 1.5,
    borderRadius: radius.md,
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
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  reportButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  reportSection: {
    gap: 8,
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
    borderRadius: radius.md,
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
    borderRadius: radius.md,
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
    borderRadius: radius.md,
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
    borderRadius: radius.md,
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
  reportSection: {
    gap: 10,
  },
  reportActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  reportActionText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
