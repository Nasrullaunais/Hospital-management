import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { wardReceptionistService, type BedStatus } from '@/features/wardReceptionist/services/wardReceptionist.service';
import { Badge, EmptyState, ErrorState } from '@/components/ui';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';

export default function BedListScreen() {
  const router = useRouter();
  const [beds, setBeds] = useState<BedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const fetchBedStatuses = useCallback(async () => {
    try {
      setError(null);
      const data = await wardReceptionistService.getBedStatuses();
      setBeds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load beds.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBedStatuses().finally(() => setLoading(false));
  }, [fetchBedStatuses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBedStatuses();
    setRefreshing(false);
  }, [fetchBedStatuses]);

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

  const getStatusBorderColor = useCallback((status: BedStatus['status']) => {
    switch (status) {
      case 'occupied':
        return theme.error;
      case 'vacant':
        return theme.success;
      case 'maintenance':
        return theme.warning;
      case 'reserved':
        return theme.border;
      default:
        return theme.border;
    }
  }, [theme]);

  const renderBed = useCallback(({ item }: { item: BedStatus }) => {
    const badgeVariant = getStatusBadgeVariant(item.status);
    const borderColor = getStatusBorderColor(item.status);
    const patientDisplay = item.patientName
      ? item.patientName.length > 20
        ? item.patientName.slice(0, 20) + '\u2026'
        : item.patientName
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.bedCard,
          {
            backgroundColor: theme.surface,
            borderColor: borderColor,
          },
        ]}
        onPress={() => router.push({
          pathname: '/(receptionist)/beds/[id]',
          params: { id: item._id, bedData: JSON.stringify(item) },
        })}
        activeOpacity={0.7}
        testID={`bed-card-${item._id}`}
      >
        <View style={styles.bedHeader}>
          <View style={[styles.bedNumberBadge, { backgroundColor: theme.surfaceTertiary }]}>
            <Text style={[styles.bedNumberText, { color: theme.text }]}>#{item.bedNumber}</Text>
          </View>
          <Badge
            label={getStatusLabel(item.status)}
            variant={badgeVariant}
            size="sm"
          />
        </View>

        <View style={styles.bedInfo}>
          <Text style={[styles.wardName, { color: theme.text }]}>{item.wardName}</Text>
          {patientDisplay ? (
            <View style={styles.patientRow}>
              <Feather name="user" size={12} color={theme.textSecondary} />
              <Text style={[styles.patientName, { color: theme.textSecondary }]}>{patientDisplay}</Text>
            </View>
          ) : (
            <View style={styles.patientRow}>
              <Feather name="user" size={12} color={theme.success} />
              <Text style={[styles.patientName, { color: theme.success }]}>Vacant</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [theme, router, getStatusBadgeVariant, getStatusLabel, getStatusBorderColor]);

  const keyExtractor = useCallback((item: BedStatus) => `${item._id}-${item.bedNumber}`, []);

  const ListEmptyComponent = (
    <EmptyState
      title="No beds found"
      message="There are no beds available in the ward at the moment."
      icon="bed"
    />
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
        <ErrorState message={error} onRetry={fetchBedStatuses} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]} testID="beds-screen">
      <FlatList
        data={beds}
        keyExtractor={keyExtractor}
        renderItem={renderBed}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={beds.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  row: { justifyContent: 'space-between' },
  bedCard: {
    width: '48%',
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  bedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bedNumberBadge: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bedNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bedInfo: { gap: spacing.xs },
  wardName: {
    fontSize: 15,
    fontWeight: '600',
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  patientName: {
    fontSize: 13,
  },
});
