import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack, ErrorBoundary } from 'expo-router';
import {
  wardReceptionistService,
  type BedStatus,
  type PatientMedication,
} from '@/features/wardReceptionist/services/wardReceptionist.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius } from '@/constants/ThemeTokens';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [bed, setBed] = useState<BedStatus | null>(null);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [unassigning, setUnassigning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bedsData = await wardReceptionistService.getBedStatuses();
        const found = bedsData.find((b) => b.patientId === id);
        if (found) {
          setBed(found);
        }
      } catch (err) {
        console.error('fetchBedStatuses error:', err);
        Alert.alert('Error', 'Failed to load patient data. Please try again.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchMedications = async () => {
      if (!bed?.patientId) {
        setMedicationsLoading(false);
        return;
      }

      try {
        const meds = await wardReceptionistService.getPatientMedications(bed.patientId);
        setMedications(meds);
      } catch (err) {
        console.error('[PatientDetail] getPatientMedications error:', err);
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load medications. Please try again.');
      } finally {
        setMedicationsLoading(false);
      }
    };

    if (bed) {
      fetchMedications();
    }
  }, [bed]);

  const handleUnassign = useCallback(async () => {
    if (!bed?.patientId) return;

    Alert.alert(
      'Unassign Patient',
      `Are you sure you want to unassign ${bed.patientName} from bed #${bed.bedNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            setUnassigning(true);
            try {
              await wardReceptionistService.unassignPatient(bed.patientId!);
              router.back();
            } catch (err) {
              console.error('[PatientDetail] unassign error:', err);
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to unassign patient. Please try again.');
            } finally {
              setUnassigning(false);
            }
          },
        },
      ]
    );
  }, [bed, router]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!bed) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Patient not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <>
        <Stack.Screen
          options={{
            title: bed.patientName ?? 'Patient Details',
            headerShown: true,
          }}
        />
        <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Patient Info Header */}
            <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <View style={styles.headerRow}>
                <View style={[styles.patientIcon, { backgroundColor: theme.primaryLight }]}>
                  <Feather name="user" size={28} color={theme.primary} />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={[styles.patientName, { color: theme.text }]}>
                    {bed.patientName ?? 'Unknown Patient'}
                  </Text>
                  <Text style={[styles.wardInfo, { color: theme.textSecondary }]}>
                    {bed.wardName} • Bed #{bed.bedNumber}
                  </Text>
                </View>
              </View>
            </View>

            {/* Assignment Details */}
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Assignment Details</Text>

              <View style={styles.infoRow}>
                <Feather name="calendar" size={18} color={theme.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Admission Date</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {formatDate(bed.admissionDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Feather name="log-out" size={18} color={theme.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Expected Discharge</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {formatDate(bed.expectedDischarge)}
                  </Text>
                </View>
              </View>

              {bed.patientPhone && (
                <View style={styles.infoRow}>
                  <Feather name="phone" size={18} color={theme.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Phone</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{bed.patientPhone}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Medications Section */}
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Medications</Text>

              {medicationsLoading ? (
                <View style={styles.medicationsLoading}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Loading medications...
                  </Text>
                </View>
              ) : medications.length === 0 ? (
                <View style={styles.emptyMedications}>
                  <Feather name="info" size={20} color={theme.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No active medications for this patient.
                  </Text>
                </View>
              ) : (
                medications
                  .filter((med) => med.status === 'active')
                  .map((med) => (
                    <View
                      key={med._id}
                      style={[styles.medicationCard, { backgroundColor: theme.background }]}
                    >
                      <View style={styles.medicationHeader}>
                        <Text style={[styles.medicationName, { color: theme.text }]}>
                          {med.medicationName}
                        </Text>
                        <View style={[styles.medStatusBadge, { backgroundColor: theme.successLight }]}>
                          <Text style={[styles.medStatusText, { color: theme.success }]}>
                            {med.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.medicationDetails}>
                        <View style={styles.medDetailItem}>
                          <Text style={[styles.medDetailLabel, { color: theme.textTertiary }]}>Dosage</Text>
                          <Text style={[styles.medDetailValue, { color: theme.text }]}>{med.dosage}</Text>
                        </View>
                        <View style={styles.medDetailItem}>
                          <Text style={[styles.medDetailLabel, { color: theme.textTertiary }]}>Frequency</Text>
                          <Text style={[styles.medDetailValue, { color: theme.text }]}>{med.frequency}</Text>
                        </View>
                        <View style={styles.medDetailItem}>
                          <Text style={[styles.medDetailLabel, { color: theme.textTertiary }]}>Route</Text>
                          <Text style={[styles.medDetailValue, { color: theme.text }]}>{med.route}</Text>
                        </View>
                      </View>
                      {med.notes && (
                        <Text style={[styles.medNotes, { color: theme.textSecondary }]}>
                          Notes: {med.notes}
                        </Text>
                      )}
                    </View>
                  ))
              )}
            </View>

            {/* Unassign Action */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.unassignButton, { backgroundColor: theme.error }]}
                activeOpacity={0.8}
                onPress={handleUnassign}
                disabled={unassigning}
              >
                {unassigning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="user-x" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Unassign Patient</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md },
  headerCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  patientIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  patientName: { fontSize: 20, fontWeight: '700' },
  wardInfo: { fontSize: 14, marginTop: 2 },
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  medicationsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: { fontSize: 14 },
  emptyMedications: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: { fontSize: 14 },
  medicationCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  medicationName: { fontSize: 15, fontWeight: '600' },
  medStatusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  medStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  medicationDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  medDetailItem: {},
  medDetailLabel: { fontSize: 11, marginBottom: 2 },
  medDetailValue: { fontSize: 13, fontWeight: '500' },
  medNotes: {
    fontSize: 13,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  unassignButton: { backgroundColor: '#dc2626' },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorText: { fontSize: 15, marginTop: spacing.md },
  retryText: { fontWeight: '600', fontSize: 15, marginTop: spacing.sm },
});