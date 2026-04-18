import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse, Appointment, User } from '@/shared/types';
import { ListCard, EmptyState, LoadingState, ErrorState } from '@/components/ui';

const STATUS_VARIANTS = {
  Pending: 'warning' as const,
  Confirmed: 'info' as const,
  Completed: 'success' as const,
  Cancelled: 'error' as const,
};

export default function DoctorScheduleScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const fetchSchedule = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[]; count: number }>>(
        ENDPOINTS.APPOINTMENTS.MY_DOCTOR_SCHEDULE,
      );
      setAppointments(res.data.data.appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your schedule.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSchedule().finally(() => setLoading(false));
  }, [fetchSchedule]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Appointment }) => {
    const patientName = typeof item.patientId === 'object'
      ? (item.patientId as User).name
      : 'Unknown Patient';

    const statusVariant = STATUS_VARIANTS[item.status] ?? 'neutral';

    return (
      <ListCard
        title={patientName}
        subtitle={new Date(item.appointmentDate).toLocaleString()}
        badge={{ label: item.status, variant: statusVariant }}
        leftContent={
          <SymbolView
            name={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }}
            tintColor={colors.textTertiary}
            size={32}
          />
        }
        footer={
          item.reasonForVisit ? (
            <View style={styles.reasonRow}>
              <SymbolView
                name={{ ios: 'text.alignleft', android: 'notes', web: 'notes' }}
                tintColor={colors.textTertiary}
                size={14}
              />
              <Text
                style={[styles.reasonText, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.reasonForVisit}
              </Text>
            </View>
          ) : undefined
        }
      />
    );
  };

  if (loading && appointments.length === 0) {
    return <LoadingState message="Loading your schedule..." />;
  }

  if (error && appointments.length === 0) {
    return <ErrorState message={error} onRetry={fetchSchedule} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Schedule</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No Appointments"
            message="You don't have any appointments scheduled yet."
            icon="calendar.badge.exclamationmark"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContainer: { padding: 12 },
  emptyContainer: { flex: 1 },
  header: {
    marginBottom: 12,
    paddingTop: 4,
    gap: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  reasonText: { fontSize: 13, flex: 1 },
});
