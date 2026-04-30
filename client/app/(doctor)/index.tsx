import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { APPOINTMENT_STATUS } from '@/shared/constants/appointmentStatus';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import type { ApiSuccessResponse, Appointment, User } from '@/shared/types';

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCount = allAppointments.filter((appt) => {
        const apptDate = new Date(appt.appointmentDate);
        return apptDate >= today && apptDate < tomorrow && appt.status !== APPOINTMENT_STATUS.CANCELLED;
      }).length;

      const uniquePatients = new Set(
        allAppointments
          .filter((appt) => appt.status === APPOINTMENT_STATUS.COMPLETED || appt.status === APPOINTMENT_STATUS.CONFIRMED)
          .map((appt) => {
            if (typeof appt.patientId === 'object') return (appt.patientId as User)._id;
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

  const nameParts = user?.name?.split(' ') ?? [];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] ?? 'Doctor';
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
          <Text style={[styles.greetingText, { color: colors.text }]}>Hello, Dr. {lastName}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{today}</Text>
        </View>

        {/* Today's Schedule Panel — Pulse hero section */}
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
          <View style={[styles.statCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
            <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={colors.primary} size={22} />
            {stats.loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 4 }} />
            ) : (
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.todayCount}</Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today's Appts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
            <SymbolView name={{ ios: 'person.3', android: 'groups', web: 'groups' }} tintColor={colors.primary} size={22} />
            {stats.loading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 4 }} />
            ) : (
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalPatients}</Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Patients</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Quick Actions</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}
            onPress={() => router.push('/(doctor)/records/add-record')}
          >
            <View style={[styles.tileIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Feather name="file-text" size={24} color={colors.primary} />
            </View>
            <View style={styles.tileContent}>
              <Text style={[styles.tileLabel, { color: colors.text }]}>Create Record</Text>
              <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Add diagnosis & labs</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}
            onPress={() => router.push('/(doctor)/records')}
          >
            <View style={[styles.tileIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Feather name="list" size={24} color={colors.primary} />
            </View>
            <View style={styles.tileContent}>
              <Text style={[styles.tileLabel, { color: colors.text }]}>Patient Logs</Text>
              <Text style={[styles.tileSub, { color: colors.textSecondary }]}>Review records</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom CTA */}
        <TouchableOpacity
          style={[styles.bottomCta, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
          onPress={() => router.push('/(doctor)/appointments')}
        >
          <Feather name="calendar" size={20} color="#fff" />
          <Text style={styles.bottomCtaText}>View Today's Schedule</Text>
        </TouchableOpacity>
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
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
  },
  greeting: {
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  todayPanel: {
    borderRadius: radius.lg,
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
    borderRadius: radius.full,
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
    borderRadius: radius.md,
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
    borderRadius: radius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 90,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  bottomCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
