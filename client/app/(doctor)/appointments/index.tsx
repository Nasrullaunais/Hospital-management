import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { ApiSuccessResponse, Appointment, User } from '@/shared/types';

export default function DoctorScheduleScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.patientName}>{patientName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.date}>{new Date(item.appointmentDate).toLocaleString()}</Text>
        {item.reasonForVisit ? <Text style={styles.reason}>{item.reasonForVisit}</Text> : null}
      </View>
    );
  };

  if (loading && appointments.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchSchedule}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.listContainer}
      ListHeaderComponent={<Text style={styles.header}>My Schedule</Text>}
      ListEmptyComponent={<Text style={styles.emptyText}>No appointments assigned yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, paddingTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  date: { fontSize: 13, color: '#555', marginBottom: 4 },
  reason: { fontSize: 13, color: '#777' },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});
