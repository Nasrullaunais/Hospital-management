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
import { Card, Badge, EmptyState, ErrorState } from '@/components/ui';
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

      const patientIds = occupiedBeds
        .map((bed) => bed.patientId)
        .filter((id): id is string => !!id);

      const medicationsResults = await Promise.all(
        patientIds.map((patientId) =>
          wardReceptionistService.getPatientMedications(patientId).catch(() => []),
        ),
      );

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

  const getMedStatusVariant = useCallback((status: string): 'success' | 'warning' | 'neutral' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'discontinued':
        return 'neutral';
      default:
        return 'neutral';
    }
  }, []);

  const renderMedicationCard = ({ item }: { item: MedicationWithPatient }) => {
    const statusVariant = getMedStatusVariant(item.status);

    return (
      <Card style={styles.medicationCard} testID={`medication-card-${item._id}`}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: theme.text }]}>
              {item.patientName}
            </Text>
            <Text style={[styles.bedInfo, { color: theme.textSecondary }]}>
              {item.wardName} • Bed {item.bedNumber}
            </Text>
          </View>
          <Badge
            label={item.status}
            variant={statusVariant}
            size="sm"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.medicationDetails}>
          <Text style={[styles.medicationName, { color: theme.text }]}>
            {item.medicationName}
          </Text>

          <View style={styles.medicationMeta}>
            <View style={styles.metaItem}>
              <Feather name="droplet" size={13} color={theme.textTertiary} />
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Dosage</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{item.dosage}</Text>
            </View>

            <View style={styles.metaItem}>
              <Feather name="clock" size={13} color={theme.textTertiary} />
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Frequency</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{item.frequency}</Text>
            </View>

            <View style={styles.metaItem}>
              <Feather name="navigation" size={13} color={theme.textTertiary} />
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Route</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{item.route}</Text>
            </View>
          </View>

          {item.notes && (
            <Text style={[styles.notes, { color: theme.textSecondary }]}>
              {item.notes}
            </Text>
          )}
        </View>
      </Card>
    );
  };

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
  divider: { height: 1, marginVertical: spacing.md },
  medicationDetails: { gap: spacing.sm },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  medicationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 13, fontWeight: '500' },
  notes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
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
