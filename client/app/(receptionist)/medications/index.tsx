import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Card, EmptyState, ErrorState } from '@/components/ui';
import {
  wardReceptionistService,
  type PatientMedication,
  type BedStatus,
} from '@/features/wardReceptionist/services/wardReceptionist.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

interface MedicationWithPatient extends PatientMedication {
  patientName: string;
  bedNumber: number;
  wardName: string;
}

export default function MedicationsListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [medications, setMedications] = useState<MedicationWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const bedsData = await wardReceptionistService.getBedStatuses();
      const occupiedBeds = bedsData.filter(
        (bed) => bed.status === 'occupied' && bed.patientId,
      );

      // Fetch medications for each patient in parallel
      const patientIds = occupiedBeds
        .map((bed) => bed.patientId)
        .filter((id): id is string => !!id);

      const medicationsResults = await Promise.all(
        patientIds.map((patientId) =>
          wardReceptionistService.getPatientMedications(patientId).catch(() => []),
        ),
      );

      // Flatten and join with patient info
      const allMedications: MedicationWithPatient[] = [];

      occupiedBeds.forEach((bed, index) => {
        if (!bed.patientId) return;
        const patientMeds = medicationsResults[index] || [];
        patientMeds.forEach((med) => {
          allMedications.push({
            ...med,
            patientName: bed.patientName ?? 'Unknown Patient',
            bedNumber: bed.bedNumber,
            wardName: bed.wardName,
          });
        });
      });

      // Sort by patient name, then medication name
      allMedications.sort((a, b) => {
        const patientCompare = a.patientName.localeCompare(b.patientName);
        if (patientCompare !== 0) return patientCompare;
        return a.medicationName.localeCompare(b.medicationName);
      });

      setMedications(allMedications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medications.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const renderMedicationCard = ({ item }: { item: MedicationWithPatient }) => (
    <Card style={[styles.medicationCard, { borderColor: theme.border }]} testID={`medication-card-${item._id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Text style={[styles.patientName, { color: theme.text }]}>
            {item.patientName}
          </Text>
          <Text style={[styles.bedInfo, { color: theme.textSecondary }]}>
            {item.wardName} • Bed {item.bedNumber}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'active' ? theme.successBg : theme.surfaceTertiary,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.status === 'active' ? theme.success : theme.textSecondary },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.divider }]} />

      <View style={styles.medicationDetails}>
        <View style={styles.medicationRow}>
          <Feather name="circle" size={12} color={theme.primary} style={styles.bulletIcon} />
          <Text style={[styles.medicationLabel, { color: theme.textSecondary }]}>
            Medication:
          </Text>
          <Text style={[styles.medicationValue, { color: theme.text }]}>
            {item.medicationName}
          </Text>
        </View>

        <View style={styles.medicationRow}>
          <Feather name="circle" size={12} color={theme.primary} style={styles.bulletIcon} />
          <Text style={[styles.medicationLabel, { color: theme.textSecondary }]}>
            Dosage:
          </Text>
          <Text style={[styles.medicationValue, { color: theme.text }]}>
            {item.dosage}
          </Text>
        </View>

        <View style={styles.medicationRow}>
          <Feather name="circle" size={12} color={theme.primary} style={styles.bulletIcon} />
          <Text style={[styles.medicationLabel, { color: theme.textSecondary }]}>
            Frequency:
          </Text>
          <Text style={[styles.medicationValue, { color: theme.text }]}>
            {item.frequency}
          </Text>
        </View>

        <View style={styles.medicationRow}>
          <Feather name="circle" size={12} color={theme.primary} style={styles.bulletIcon} />
          <Text style={[styles.medicationLabel, { color: theme.textSecondary }]}>
            Route:
          </Text>
          <Text style={[styles.medicationValue, { color: theme.text }]}>
            {item.route}
          </Text>
        </View>

        {item.notes && (
          <View style={styles.medicationRow}>
            <Feather name="circle" size={12} color={theme.textTertiary} style={styles.bulletIcon} />
            <Text style={[styles.medicationLabel, { color: theme.textSecondary }]}>
              Notes:
            </Text>
            <Text style={[styles.medicationValue, { color: theme.textSecondary }]}>
              {item.notes}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState message={error} onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]} testID="medications-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Medications</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          All medications for patients in the ward
        </Text>
      </View>

      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.surfaceTertiary }]}>
            <Feather name="package" size={40} color={theme.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No Medications
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            No medications have been prescribed for any patient in the ward yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          renderItem={renderMedicationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: spacing.xs },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
    gap: spacing.md,
  },
  medicationCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '600' },
  bedInfo: { fontSize: 13, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  divider: { height: 1, marginVertical: spacing.md },
  medicationDetails: { gap: spacing.sm },
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginRight: spacing.sm,
    marginTop: 3,
  },
  medicationLabel: { fontSize: 13, minWidth: 75 },
  medicationValue: { fontSize: 13, flex: 1, fontWeight: '500' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: TAB_BAR_HEIGHT,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
