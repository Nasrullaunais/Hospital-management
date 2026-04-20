import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Button, Badge, ErrorState, EmptyState } from '@/components/ui';
import { wardReceptionistService, type WardStats, type WardAssignment } from '@/features/wardReceptionist/services/wardReceptionist.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

interface UpcomingDischarge {
  _id: string;
  patientName: string;
  wardName: string;
  bedNumber: number;
  expectedDischarge: string;
}

export default function WardDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [stats, setStats] = useState<WardStats | null>(null);
  const [upcomingDischarges, setUpcomingDischarges] = useState<UpcomingDischarge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsData, bedsData] = await Promise.all([
        wardReceptionistService.getWardStats(),
        wardReceptionistService.getBedStatuses(),
      ]);
      setStats(statsData);

      // Filter upcoming discharges (next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const discharges: UpcomingDischarge[] = bedsData
        .filter((bed) => {
          if (!bed.expectedDischarge) return false;
          const dischargeDate = new Date(bed.expectedDischarge);
          return dischargeDate >= now && dischargeDate <= tomorrow;
        })
        .map((bed) => ({
          _id: bed._id,
          patientName: bed.patientName ?? 'Unknown Patient',
          wardName: bed.wardName,
          bedNumber: bed.bedNumber,
          expectedDischarge: bed.expectedDischarge!,
        }))
        .sort((a, b) => new Date(a.expectedDischarge).getTime() - new Date(b.expectedDischarge).getTime());

      setUpcomingDischarges(discharges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]} testID="dashboard-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Ward Dashboard</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Real-time bed management overview
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid} testID="stats-card">
          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.primaryMuted }]}>
              <Feather name="home" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats?.totalBeds ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Beds</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.errorBg }]}>
              <Feather name="users" size={20} color={theme.error} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats?.occupiedBeds ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Occupied</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.successBg }]}>
              <Feather name="check-circle" size={20} color={theme.success} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {stats?.vacantBeds ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Available</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.warningBg }]}>
              <Feather name="log-out" size={20} color={theme.warning} />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {upcomingDischarges.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Discharges Today</Text>
          </Card>
        </View>

        {/* Occupancy Rate */}
        <Card style={styles.occupancyCard} testID="occupancy-bar">
          <View style={styles.occupancyHeader}>
            <Text style={[styles.occupancyTitle, { color: theme.text }]}>Overall Occupancy</Text>
            <Text style={[styles.occupancyPercent, { color: theme.primary }]}>
              {Math.round(stats?.occupancyRate ?? 0)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.surfaceTertiary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats?.occupancyRate ?? 0}%`,
                  backgroundColor:
                    (stats?.occupancyRate ?? 0) >= 90
                      ? theme.error
                      : (stats?.occupancyRate ?? 0) >= 70
                      ? theme.warning
                      : theme.success,
                },
              ]}
            />
          </View>
        </Card>

        {/* Upcoming Discharges */}
        <Card title="Upcoming Discharges" style={styles.sectionCard} testID="upcoming-discharges">
          {upcomingDischarges.length === 0 ? (
            <View style={styles.emptyDischarges}>
              <Feather name="calendar" size={32} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No discharges scheduled in the next 24 hours
              </Text>
            </View>
          ) : (
            upcomingDischarges.map((discharge) => (
              <View
                key={discharge._id}
                style={[styles.dischargeItem, { borderBottomColor: theme.divider }]}
              >
                <View style={styles.dischargeInfo}>
                  <Text style={[styles.dischargeName, { color: theme.text }]}>
                    {discharge.patientName}
                  </Text>
                  <Text style={[styles.dischargeDetails, { color: theme.textSecondary }]}>
                    {discharge.wardName} • Bed {discharge.bedNumber}
                  </Text>
                </View>
                <View style={styles.dischargeTime}>
                  <Text style={[styles.dischargeDate, { color: theme.textSecondary }]}>
                    {formatDate(discharge.expectedDischarge)}
                  </Text>
                  <Text style={[styles.dischargeHour, { color: theme.warning }]}>
                    {formatTime(discharge.expectedDischarge)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions" style={styles.sectionCard}>
          <View style={styles.actionsGrid}>
            <Button
              title="Assign Patient"
              onPress={() => router.push('/(receptionist)/assign')}
              variant="primary"
              fullWidth
              style={styles.actionButton}
              testID="btn-assign-patient"
            />
            <Button
              title="View All Beds"
              onPress={() => router.push('/(receptionist)/beds')}
              variant="outline"
              fullWidth
              style={styles.actionButton}
              testID="btn-view-beds"
            />
            <Button
              title="View Patients"
              onPress={() => router.push('/(receptionist)/patients')}
              variant="secondary"
              fullWidth
              style={styles.actionButton}
              testID="btn-view-patients"
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
    gap: spacing.md,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: spacing.xs },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: spacing.xs },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: spacing.xs },
  occupancyCard: { padding: spacing.lg },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  occupancyTitle: { fontSize: 15, fontWeight: '600' },
  occupancyPercent: { fontSize: 18, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: radius.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.xs },
  sectionCard: { padding: spacing.lg },
  emptyDischarges: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  dischargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  dischargeInfo: { flex: 1 },
  dischargeName: { fontSize: 15, fontWeight: '600' },
  dischargeDetails: { fontSize: 13, marginTop: 2 },
  dischargeTime: { alignItems: 'flex-end' },
  dischargeDate: { fontSize: 12 },
  dischargeHour: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  actionsGrid: { gap: spacing.sm },
  actionButton: { marginBottom: spacing.xs },
});
