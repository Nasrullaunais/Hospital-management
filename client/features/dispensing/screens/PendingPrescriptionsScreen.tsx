import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function PendingPrescriptionsScreen() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const loadPending = useCallback(async () => {
    try {
      setError(null);
      const data = await dispensingService.getPendingPrescriptions();
      setPending(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPending();
  }, [loadPending]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const patientName = typeof item.patientId === 'object' ? item.patientId?.name : 'Patient';
    const doctorName = typeof item.doctorId === 'object' ? item.doctorId?.userId?.name : 'Doctor';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/dispense/${item._id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.patientName, { color: theme.text }]}>{patientName}</Text>
          <View style={[styles.pendingBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
            <Text style={[styles.pendingBadgeText, { color: theme.warning }]}>PENDING</Text>
          </View>
        </View>
        <Text style={[styles.doctor, { color: theme.textSecondary }]}>Dr. {doctorName}</Text>
        <View style={styles.cardBottom}>
          <Text style={[styles.date, { color: theme.textTertiary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={[styles.medicineCountBadge, { backgroundColor: theme.successBg }]}>
            <Text style={[styles.medicineCount, { color: theme.success }]}>{item.items.length} medicine(s)</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, router]);

  const keyExtractor = useCallback((item: any) => item._id, []);

  const ListHeaderComponent = useMemo(() => (
    <View style={[styles.headerBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Pending Prescriptions</Text>
      <View style={[styles.countBadge, { backgroundColor: theme.surfaceTertiary }]}>
        <Text style={[styles.count, { color: theme.textSecondary }]}>{pending.length} waiting</Text>
      </View>
    </View>
  ), [theme, pending.length]);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="check-circle" size={48} color={theme.success} />
      <Text style={[styles.empty, { color: theme.textSecondary }]}>No pending prescriptions</Text>
      <Text style={[styles.emptySub, { color: theme.textTertiary }]}>All caught up!</Text>
    </View>
  ), [theme]);

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );

  if (error) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Feather name="alert-circle" size={48} color={theme.error} />
      <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      <TouchableOpacity onPress={loadPending} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={pending}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={pending.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingTop: spacing.sm },
  emptyList: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  countBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },
  count: { fontSize: 13, fontWeight: '500' },
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  patientName: { fontSize: 18, fontWeight: '700' },
  pendingBadge: { borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  doctor: { fontSize: 14, marginBottom: spacing.sm },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 13 },
  medicineCountBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  medicineCount: { fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  emptySub: { fontSize: 14, marginTop: spacing.xs },
  error: { fontSize: 15, marginBottom: spacing.md },
  retryBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});