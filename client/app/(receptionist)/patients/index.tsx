import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Badge, EmptyState, ErrorState } from '@/components/ui';
import { wardReceptionistService, type BedStatus } from '@/features/wardReceptionist/services/wardReceptionist.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function PatientsListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [patients, setPatients] = useState<BedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setError(null);
      const bedsData = await wardReceptionistService.getBedStatuses();
      const assignedPatients = bedsData.filter(
        (bed) => bed.status === 'occupied' && bed.patientId,
      );
      setPatients(assignedPatients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPatients().finally(() => setLoading(false));
  }, [fetchPatients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  }, [fetchPatients]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePatientPress = (patientId: string) => {
    router.push(`/(receptionist)/patients/${patientId}` as any);
  };

  const renderPatientCard = ({ item }: { item: BedStatus }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => item.patientId && handlePatientPress(item.patientId)}
      testID={`patient-card-${item._id}`}
    >
      <Card style={styles.patientCard}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <Text style={[styles.patientName, { color: theme.text }]}>
              {item.patientName ?? 'Unknown Patient'}
            </Text>
            <Text style={[styles.wardName, { color: theme.textSecondary }]}>
              {item.wardName}
            </Text>
          </View>
          <Badge
            label={`Bed ${item.bedNumber}`}
            variant="primary"
            size="md"
          />
        </View>

        <View style={[styles.cardDetails, { borderTopColor: theme.divider }]}>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={14} color={theme.textTertiary} />
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Admitted</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(item.admissionDate)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="log-out" size={14} color={theme.textTertiary} />
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Discharge</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {formatDate(item.expectedDischarge)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
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
        <ErrorState message={error} onRetry={fetchPatients} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]} testID="patients-screen">
      <FlatList
        data={patients}
        keyExtractor={(item) => item._id}
        renderItem={renderPatientCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No patients in ward"
            message="There are no patients currently assigned to beds in this ward."
            icon="users"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
    gap: spacing.md,
    flexGrow: 1,
  },
  patientCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  wardName: {
    fontSize: 13,
  },
  cardDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
});
