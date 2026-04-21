import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { APPOINTMENT_STATUS } from '@/shared/constants/appointmentStatus';
import type { ApiSuccessResponse, Appointment } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

export default function DoctorDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [stats, setStats] = useState({ todayCount: 0, totalPatients: 0, loading: true });

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[]; count: number }>>(
        ENDPOINTS.APPOINTMENTS.MY_DOCTOR_SCHEDULE,
      );
      const allAppointments = res.data.data.appointments;

      // Today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCount = allAppointments.filter((appt) => {
        const apptDate = new Date(appt.appointmentDate);
        return apptDate >= today && apptDate < tomorrow && appt.status !== APPOINTMENT_STATUS.CANCELLED;
      }).length;

      // Unique patients
      const uniquePatients = new Set(
        allAppointments
          .filter((appt) => appt.status === APPOINTMENT_STATUS.COMPLETED || appt.status === APPOINTMENT_STATUS.CONFIRMED)
          .map((appt) => {
            if (typeof appt.patientId === 'object') return (appt.patientId as any)._id;
            return appt.patientId;
          })
      );

      setStats({ todayCount, totalPatients: uniquePatients.size, loading: false });
    } catch {
      setStats({ todayCount: 0, totalPatients: 0, loading: false });
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const firstName = user?.name?.split(' ')[0] ?? 'Doctor';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingText, { color: colors.text }]}>Hello, {firstName}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{today}</Text>
      </View>

      {/* Today's Panel — most prominent */}
      <View style={[styles.todayPanel, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
        <View style={styles.todayHeader}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
          <SymbolView
            name={{ ios: 'calendar.badge.clock', android: 'event', web: 'event' }}
            tintColor="rgba(255,255,255,0.9)"
            size={32}
          />
        </View>
        <Text style={styles.todayTitle}>Your Schedule</Text>
        <Text style={styles.todayBody}>Review appointments and keep patient care up to date.</Text>
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => router.push('/(doctor)/appointments')}
        >
          <Text style={[styles.todayButtonText, { color: colors.primary }]}>Open My Schedule</Text>
          <SymbolView name={{ ios: 'arrow.right', android: 'chevron_right', web: 'chevron_right' }} tintColor={colors.primary} size={18} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={colors.primary} size={22} />
          {stats.loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
          ) : (
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.todayCount}</Text>
          )}
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Appts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <SymbolView name={{ ios: 'person.3', android: 'groups', web: 'groups' }} tintColor={colors.primary} size={22} />
          {stats.loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
          ) : (
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalPatients}</Text>
          )}
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Patients</Text>
        </View>
      </View>

      {/* Action Tiles */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Quick Actions</Text>
      <View style={styles.gridRow}>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(doctor)/records/add-record')}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primaryMuted }]}>
            <SymbolView name={{ ios: 'doc.badge.plus', android: 'add_circle', web: 'add_circle' }} tintColor={colors.primary} size={24} />
          </View>
          <View style={styles.tileContent}>
            <Text style={[styles.tileLabel, { color: colors.text }]}>Create Record</Text>
            <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Add diagnosis & labs</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tile, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(doctor)/records')}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: colors.primaryMuted }]}>
            <SymbolView name={{ ios: 'list.bullet.clipboard', android: 'assignment', web: 'assignment' }} tintColor={colors.primary} size={24} />
          </View>
          <View style={styles.tileContent}>
            <Text style={[styles.tileLabel, { color: colors.text }]}>Patient Logs</Text>
            <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Review records</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: TAB_BAR_HEIGHT + 16,
  },
  greeting: {
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  todayPanel: {
    borderRadius: 16,
    padding: 18,
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  todayBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tileContent: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  tileSub: {
    fontSize: 12,
    lineHeight: 15,
  },
});
