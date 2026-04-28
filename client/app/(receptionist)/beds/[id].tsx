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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { wardReceptionistService, type BedStatus } from '@/features/wardReceptionist/services/wardReceptionist.service';
import { Badge } from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function BedDetailScreen() {
  const { id, bedData } = useLocalSearchParams<{ id: string; bedData?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [bed, setBed] = useState<BedStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unassigning, setUnassigning] = useState(false);

  useEffect(() => {
    if (bedData) {
      try {
        const parsed = JSON.parse(bedData) as BedStatus;
        if (parsed) {
          setBed(parsed);
          setLoading(false);
          return;
        }
      } catch {
        // silent — fall through to API fetch below
      }
    }
    wardReceptionistService.getBedStatuses()
      .then(beds => beds.find(b => b._id === id))
      .then(found => {
        if (found) setBed(found);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id, bedData]);

  const getStatusBadgeVariant = useCallback((status: BedStatus['status']): 'success' | 'error' | 'warning' | 'info' | 'neutral' => {
    switch (status) {
      case 'vacant':
        return 'success';
      case 'occupied':
        return 'error';
      case 'maintenance':
        return 'warning';
      case 'reserved':
        return 'neutral';
      default:
        return 'neutral';
    }
  }, []);

  const getStatusLabel = useCallback((status: BedStatus['status']) => {
    switch (status) {
      case 'occupied':
        return 'Occupied';
      case 'vacant':
        return 'Available';
      case 'maintenance':
        return 'Maintenance';
      case 'reserved':
        return 'Reserved';
      default:
        return status;
    }
  }, []);

  const getStatusAccentColor = useCallback((status: BedStatus['status']) => {
    switch (status) {
      case 'occupied':
        return theme.error;
      case 'vacant':
        return theme.success;
      case 'maintenance':
        return theme.warning;
      case 'reserved':
        return theme.textSecondary;
      default:
        return theme.textSecondary;
    }
  }, [theme]);

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
              console.error('[BedDetail] unassign error:', err);
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to unassign patient. Please try again.');
            } finally {
              setUnassigning(false);
            }
          },
        },
      ]
    );
  }, [bed, router]);

  const handleAssignPatient = useCallback(() => {
    Alert.alert('Assign Patient', `Bed #${bed?.bedNumber} is available. Use the Patients tab to assign a patient.`);
  }, [bed]);

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
          <Text style={[styles.errorText, { color: theme.error }]}>Bed not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badgeVariant = getStatusBadgeVariant(bed.status);
  const accentColor = getStatusAccentColor(bed.status);
  const isOccupied = bed.status === 'occupied';
  const isVacant = bed.status === 'vacant';

  return (
    <>
      <Stack.Screen
        options={{
          title: `Bed #${bed.bedNumber}`,
          headerShown: true,
        }}
      />
      <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: accentColor }, shadows.card]}>
            <View style={styles.headerRow}>
              <View style={[styles.bedIcon, { backgroundColor: theme.surfaceTertiary, borderColor: accentColor }]}>
                <Feather name="activity" size={28} color={accentColor} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.bedTitle, { color: theme.text }]}>Bed #{bed.bedNumber}</Text>
                <Text style={[styles.wardTitle, { color: theme.textSecondary }]}>{bed.wardName}</Text>
              </View>
              <Badge label={getStatusLabel(bed.status)} variant={badgeVariant} size="md" />
            </View>
          </View>

          {/* Patient Information Section */}
          {isOccupied && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.card]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Patient Information</Text>

              <View style={styles.infoRow}>
                <Feather name="user" size={18} color={theme.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Patient Name</Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>{bed.patientName ?? 'N/A'}</Text>
                </View>
              </View>

              {bed.admissionDate && (
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={18} color={theme.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Admission Date</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {new Date(bed.admissionDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}

              {bed.expectedDischarge && (
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={18} color={theme.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>Expected Discharge</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>
                      {new Date(bed.expectedDischarge).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Vacant State */}
          {isVacant && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.card]}>
              <View style={styles.vacantRow}>
                <Feather name="check-circle" size={24} color={theme.success} />
                <Text style={[styles.vacantText, { color: theme.success }]}>
                  This bed is currently available for admission.
                </Text>
              </View>
            </View>
          )}

          {/* Maintenance State */}
          {bed.status === 'maintenance' && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.card]}>
              <View style={styles.vacantRow}>
                <Feather name="alert-triangle" size={24} color={theme.warning} />
                <Text style={[styles.vacantText, { color: theme.warning }]}>
                  This bed is under maintenance and not available.
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {isOccupied && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (bed.patientId) {
                      router.push({
                        pathname: '/(receptionist)/medications',
                        params: { patientId: bed.patientId },
                      });
                    }
                  }}
                >
                  <Feather name="eye" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>View Medications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.error }]}
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
              </>
            )}

            {isVacant && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
                onPress={handleAssignPatient}
              >
                <Feather name="user-plus" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Assign Patient</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
  bedIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerInfo: { flex: 1 },
  bedTitle: { fontSize: 20, fontWeight: '700' },
  wardTitle: { fontSize: 14, marginTop: 2 },
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
  vacantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  vacantText: { flex: 1, fontSize: 15, fontWeight: '500' },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  errorText: { fontSize: 15, marginTop: spacing.md },
  retryText: { fontWeight: '600', fontSize: 15, marginTop: spacing.sm },
});
