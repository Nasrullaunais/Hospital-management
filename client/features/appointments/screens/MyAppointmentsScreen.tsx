import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { appointmentService } from '../services/appointment.service';
import type { Appointment, Doctor, User } from '@/shared/types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#fef9c3', text: '#854d0e' },
  Confirmed: { bg: '#dbeafe', text: '#1e40af' },
  Completed: { bg: '#dcfce7', text: '#166534' },
  Cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

/**
 * MyAppointmentsScreen — Member 3
 * Displays the authenticated patient's past and upcoming appointments.
 * TODO: Add tab/filter between Upcoming and Past appointments.
 * TODO: Add a "Book New Appointment" FAB button.
 * TODO: Add appointment detail modal or navigate to a detail screen.
 */
export default function MyAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await appointmentService.getMyAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAppointments().finally(() => setLoading(false));
  }, [fetchAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await appointmentService.cancelAppointment(id);
            setAppointments((prev) =>
              prev.map((a) => (a._id === id ? { ...a, status: 'Cancelled' } : a)),
            );
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel.');
          }
        },
      },
    ]);
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const colors = STATUS_COLORS[item.status] ?? { bg: '#f3f4f6', text: '#374151' };
    // Nested populate: doctorId → Doctor { userId → User { name } }
    let doctorName = 'Unknown Doctor';
    if (typeof item.doctorId === 'object') {
      const doctor = item.doctorId as Doctor;
      if (typeof doctor.userId === 'object') {
        doctorName = doctor.userId.name;
      }
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.date}>
          📅 {new Date(item.appointmentDate).toLocaleString()}
        </Text>

        {item.reasonForVisit && (
          <Text style={styles.reason} numberOfLines={2}>
            {item.reasonForVisit}
          </Text>
        )}

        {item.status === 'Pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancel(item._id)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchAppointments}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item._id}
      renderItem={renderAppointment}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={
        appointments.length === 0 ? styles.emptyContainer : styles.listContainer
      }
      ListHeaderComponent={
        <View>
          <Text style={styles.header}>My Appointments</Text>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => router.push('/(tabs)/appointments/book' as Href)}
          >
            <Text style={styles.bookButtonText}>+ Book New Appointment</Text>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          No appointments found.{'\n'}Book your first appointment!
        </Text>
      }
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doctorName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 13, color: '#555', marginBottom: 4 },
  reason: { fontSize: 13, color: '#777', marginTop: 4 },
  cancelButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  bookButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  bookButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
