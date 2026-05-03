import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button, Badge } from '@/components/ui';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS, ONE_DAY_MS } from '@/shared/constants/pharmacy';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import { dispensingService } from '@/features/dispensing/services/dispensing.service';
import type { Medicine } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;
const FETCH_RETRIES = 1; // 1 retry = 2 total attempts
const RETRY_DELAY_MS = 1500;

interface DashboardStats {
  totalMedicines: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingPrescriptions: number;
}

interface DataErrors {
  medicines: string | null;
  prescriptions: string | null;
}

export default function PharmacistDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [stats, setStats] = useState<DashboardStats>({
    totalMedicines: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    pendingPrescriptions: 0,
  });
  const [dataErrors, setDataErrors] = useState<DataErrors>({
    medicines: null,
    prescriptions: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const calculateStats = useCallback((medicines: Medicine[]) => {
    const now = Date.now();
    const expiryThresholdMs = EXPIRY_WARNING_DAYS * ONE_DAY_MS;

    const lowStock = medicines.filter(m => m.stockQuantity < LOW_STOCK_THRESHOLD).length;
    const expiringSoon = medicines.filter(m => {
      const expiryDate = new Date(m.expiryDate).getTime();
      return (expiryDate - now) <= expiryThresholdMs && expiryDate > now;
    }).length;

    return { lowStock, expiringSoon };
  }, []);

  const fetchWithRetry = useCallback(async <T,>(
    label: string,
    fn: () => Promise<T>,
  ): Promise<{ data: T | null; error: string | null }> => {
    let lastError: string | null = null;
    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
      try {
        const data = await fn();
        return { data, error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Failed to load ${label}`;
        lastError = msg;
        if (attempt < FETCH_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    return { data: null, error: lastError };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    const [medicinesResult, prescriptionsResult] = await Promise.all([
      fetchWithRetry('medicines', () => medicineService.getMedicines()),
      fetchWithRetry('prescriptions', () => dispensingService.getPendingPrescriptions()),
    ]);

    const medicines = medicinesResult.data ?? [];
    const pending = prescriptionsResult.data;

    const { lowStock, expiringSoon } = calculateStats(medicines);

    setStats({
      totalMedicines: medicines.length,
      lowStockCount: lowStock,
      expiringSoonCount: expiringSoon,
      pendingPrescriptions: Array.isArray(pending) ? pending.length : 0,
    });
    setDataErrors({
      medicines: medicinesResult.error,
      prescriptions: prescriptionsResult.error,
    });

    setLoading(false);
    setRefreshing(false);
  }, [calculateStats, fetchWithRetry]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasAlerts = stats.lowStockCount > 0 || stats.expiringSoonCount > 0;
  const hasErrors = dataErrors.medicines !== null || dataErrors.prescriptions !== null;
  const bothFailed = dataErrors.medicines !== null && dataErrors.prescriptions !== null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Pharmacy Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Monitor stock health and manage inventory records.
        </Text>

        {hasErrors && (
          <View style={[styles.errorBanner, { backgroundColor: bothFailed ? theme.errorBg : theme.warningBg, borderColor: bothFailed ? theme.error : theme.warning }]}>
            <Feather name={bothFailed ? 'alert-triangle' : 'info'} size={18} color={bothFailed ? theme.error : theme.warning} />
            <View style={styles.errorTextContainer}>
              {dataErrors.medicines && (
                <Text style={[styles.errorText, { color: bothFailed ? theme.error : theme.warning }]}>
                  Medicines: {dataErrors.medicines}
                </Text>
              )}
              {dataErrors.prescriptions && (
                <Text style={[styles.errorText, { color: bothFailed ? theme.error : theme.warning }]}>
                  Prescriptions: {dataErrors.prescriptions}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { borderColor: bothFailed ? theme.error : theme.warning }]}>
              <Feather name="refresh-cw" size={14} color={bothFailed ? theme.error : theme.warning} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.surface, ...shadows.card }]}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.totalMedicines}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TOTAL MEDICINES</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, ...shadows.card }]}>
            <Text style={[styles.statValue, { color: stats.lowStockCount > 0 ? theme.error : theme.textSecondary }]}>
              {stats.lowStockCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>LOW STOCK</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.surface, ...shadows.card }]}>
            <Text style={[styles.statValue, { color: stats.expiringSoonCount > 0 ? theme.warning : theme.textSecondary }]}>
              {stats.expiringSoonCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>EXPIRING SOON</Text>
          </View>
        </View>

        {hasAlerts && (
          <View style={[styles.alertBanner, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
            <Feather name="alert-triangle" size={18} color={theme.error} />
            <Text style={[styles.alertBannerText, { color: theme.error }]}>
              {stats.lowStockCount > 0 && `${stats.lowStockCount} item${stats.lowStockCount > 1 ? 's' : ''} low on stock`}
              {stats.lowStockCount > 0 && stats.expiringSoonCount > 0 && ' • '}
              {stats.expiringSoonCount > 0 && `${stats.expiringSoonCount} expiring within 60 days`}
            </Text>
          </View>
        )}

        <Card title="Inventory Workflow">
          <Button
            title="View Inventory"
            onPress={() => router.push('/(pharmacist)/pharmacy')}
            variant="accent"
            size="lg"
            fullWidth
            style={styles.primaryAction}
          />
          <Button
            title="Add Medication"
            onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}
            variant="outline"
            size="md"
            fullWidth
          />
        </Card>

        <Card title="Dispensing">
          <Button
            title={`Pending Prescriptions${stats.pendingPrescriptions > 0 ? ` (${stats.pendingPrescriptions})` : ''}`}
            onPress={() => router.push('/(pharmacist)/dispense')}
            variant="primary"
            size="md"
            fullWidth
            style={{ backgroundColor: theme.success, borderColor: theme.success }}
          />
        </Card>

        <Card style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
          <Badge label="Focus Areas" variant="info" />
          <Text style={[styles.noteText, { color: theme.text }]}>
            Track low-stock alerts daily and keep packaging images clear for quick identification.
          </Text>
        </Card>

        <Button
          title="Browse Inventory"
          onPress={() => router.push('/(pharmacist)/pharmacy')}
          variant="accent"
          size="lg"
          fullWidth
          icon="package"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
  },
  title: { fontSize: typography.xxl, fontWeight: typography.bold },
  subtitle: { fontSize: typography.sm },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  statValue: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  alertBannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
  primaryAction: { marginBottom: spacing.sm },
  noteText: { fontSize: 13, marginTop: spacing.sm },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  errorTextContainer: { flex: 1 },
  errorText: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  retryBtn: {
    padding: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.xs,
  },
});
