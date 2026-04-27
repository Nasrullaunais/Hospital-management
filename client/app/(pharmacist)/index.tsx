import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button, Badge } from '@/components/ui';
import { spacing } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS, ONE_DAY_MS } from '@/shared/constants/pharmacy';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import { dispensingService } from '@/features/dispensing/services/dispensing.service';
import type { Medicine } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

interface DashboardStats {
  totalMedicines: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingPrescriptions: number;
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

  const fetchDashboardData = useCallback(async () => {
    try {
      const [medicines, pending] = await Promise.all([
        medicineService.getMedicines().catch(() => [] as Medicine[]),
        dispensingService.getPendingPrescriptions().catch(() => []),
      ]);

      const { lowStock, expiringSoon } = calculateStats(medicines);

      setStats({
        totalMedicines: medicines.length,
        lowStockCount: lowStock,
        expiringSoonCount: expiringSoon,
        pendingPrescriptions: Array.isArray(pending) ? pending.length : 0,
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[PharmacistDashboard] Failed to load dashboard data', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateStats]);

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Pharmacist Dashboard</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Monitor stock health and update inventory records.
        </Text>

        <Card title="Inventory Workflow">
          <Button
            title="View Inventory"
            onPress={() => router.push('/(pharmacist)/pharmacy')}
            variant="primary"
            fullWidth
            style={styles.button}
          />
          <Button
            title="Add Medication"
            onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}
            variant="outline"
            fullWidth
          />
        </Card>

        <Card title="Dispensing">
          <Button
            title={`Pending Prescriptions${stats.pendingPrescriptions > 0 ? ` (${stats.pendingPrescriptions})` : ''}`}
            onPress={() => router.push('/(pharmacist)/dispense')}
            variant="primary"
            fullWidth
            style={{ backgroundColor: theme.success }}
          />
        </Card>

        <Card style={{ backgroundColor: theme.infoBg, borderColor: theme.primary }}>
          <Badge label="Focus Areas" variant="info" />
          <Text style={[styles.noteText, { color: theme.text }]}>
            Track low-stock alerts daily and keep packaging images clear for quick identification.
          </Text>
        </Card>

        <Card title="Quick Stats">
          <View style={styles.alertRow}>
            <View style={styles.alertItem}>
              <Text style={[styles.alertValue, { color: theme.primary }]}>{stats.totalMedicines}</Text>
              <Text style={[styles.alertLabel, { color: theme.textSecondary }]}>Total Medicines</Text>
            </View>
            <View style={styles.alertItem}>
              <Text style={[styles.alertValue, { color: stats.lowStockCount > 0 ? theme.error : theme.textSecondary }]}>
                {stats.lowStockCount}
              </Text>
              <Text style={[styles.alertLabel, { color: theme.textSecondary }]}>Low Stock</Text>
            </View>
            <View style={styles.alertItem}>
              <Text style={[styles.alertValue, { color: stats.expiringSoonCount > 0 ? theme.warning : theme.textSecondary }]}>
                {stats.expiringSoonCount}
              </Text>
              <Text style={[styles.alertLabel, { color: theme.textSecondary }]}>Expiring Soon</Text>
            </View>
          </View>
          {(stats.lowStockCount > 0 || stats.expiringSoonCount > 0) && (
            <View style={[styles.alertBanner, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
              <Feather name="alert-triangle" size={16} color={theme.error} />
              <Text style={[styles.alertBannerText, { color: theme.error }]}>
                {stats.lowStockCount > 0 && `${stats.lowStockCount} item${stats.lowStockCount > 1 ? 's' : ''} low on stock`}
                {stats.lowStockCount > 0 && stats.expiringSoonCount > 0 && ' • '}
                {stats.expiringSoonCount > 0 && `${stats.expiringSoonCount} expiring within 60 days`}
              </Text>
            </View>
          )}
        </Card>
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
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  button: { marginBottom: spacing.sm },
  noteText: { fontSize: 13, marginTop: spacing.sm },
  alertRow: { flexDirection: 'row', justifyContent: 'space-around' },
  alertItem: { alignItems: 'center' },
  alertValue: { fontSize: 22, fontWeight: '700' },
  alertLabel: { fontSize: 12, marginTop: 2 },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: spacing.sm,
  },
  alertBannerText: { fontSize: 13, fontWeight: '500', flex: 1 },
});
