import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { appointmentService } from '../services/appointment.service';
import type { Appointment, AppointmentStatus } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { getAppointmentStatusStyle } from '@/shared/utils/statusStyles';

const TAB_BAR_HEIGHT = 70;

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await appointmentService.getMyAppointments();
      setAppointments(data);
          } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load appointments.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAppointments().finally(() => setLoading(false));
  }, [fetchAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, [fetchAppointments]);

  const handleCancel = useCallback((id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await appointmentService.cancelAppointment(id);
            setAppointments((prev) =>
              prev.map((a) => (a._id === id ? { ...a, status: 'Cancelled' as AppointmentStatus } : a)),
            );
    } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel.');
          }
        },
      },
    ]);
  }, []);

  const renderAppointment = useCallback(({ item }: { item: Appointment }) => {
    const statusStyle = getAppointmentStatusStyle(item.status, theme);
    const doctorObj = item.doctorId && typeof item.doctorId === 'object' ? item.doctorId : null;
    const doctorName = doctorObj?.userId?.name ?? 'Unknown Doctor';

    const dateStr = new Date(item.appointmentDate).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorName, { color: theme.text }]}>{doctorName}</Text>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={14} color={theme.textTertiary} />
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>{dateStr}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        {item.reasonForVisit && (
          <View style={[styles.reasonContainer, { borderTopColor: theme.divider }]}>
            <Text style={[styles.reasonLabel, { color: theme.textTertiary }]}>Reason for Visit</Text>
            <Text style={[styles.reasonText, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.reasonForVisit}
            </Text>
          </View>
        )}

        {item.status === 'Pending' && (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.error }]}
            onPress={() => handleCancel(item._id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: theme.error }]}>Cancel Appointment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [theme, handleCancel]);

  const keyExtractor = useCallback((item: Appointment) => item._id, []);

  const ListHeaderComponent = useMemo(() => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>My Appointments</Text>
      <TouchableOpacity
        style={[styles.bookButton, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/(patient)/appointments/book' as Href)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
        <Text style={styles.bookButtonText}>Book New</Text>
      </TouchableOpacity>
    </View>
  ), [theme, router]);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContent}>
      <Feather name="calendar" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No appointments yet.</Text>
      <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>Book your first appointment to get started.</Text>
    </View>
  ), [theme]);

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
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={fetchAppointments}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={appointments}
        keyExtractor={keyExtractor}
        renderItem={renderAppointment}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  doctorInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateText: { fontSize: 13 },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: 12, fontWeight: '600' },
  reasonContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  reasonLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  reasonText: { fontSize: 14, lineHeight: 20 },
  cancelButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: { fontWeight: '600', fontSize: 14 },
  errorText: { fontSize: 15, marginBottom: spacing.sm },
  retryText: { fontWeight: '600', fontSize: 15 },
  emptyContent: { justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubText: { fontSize: 14, textAlign: 'center' },
  bookButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});