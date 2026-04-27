import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

interface PendingPrescription {
  _id: string;
  patientId: string | { _id: string; name?: string };
  doctorId: string | { _id: string; userId?: { name?: string } };
  items: Array<{ medicineId: string | { _id: string; name?: string }; medicineName: string; dosage: string; quantity: number }>;
  status: string;
  createdAt: string;
}

export default function PendingPrescriptionsScreen() {
  const [pending, setPending] = useState<PendingPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const loadPending = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum > 1) {
        setLoadingMore(true);
      }
      const data = await dispensingService.getPendingPrescriptions((pageNum - 1) * 20, 20);
      if (pageNum === 1) {
        setPending(data);
      } else {
        setPending((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load prescriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const onRefresh = useCallback(() => {
    setPage(1);
    loadPending(1, true);
  }, [loadPending]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPending(nextPage);
    }
  }, [loadingMore, hasMore, page, loadPending]);

  const renderItem = useCallback(({ item }: { item: PendingPrescription }) => {
    const patientName = item.patientId && typeof item.patientId === 'object' ? item.patientId?.name ?? 'Patient' : 'Patient';
    const doctorName = item.doctorId && typeof item.doctorId === 'object' ? item.doctorId?.userId?.name ?? 'Doctor' : 'Doctor';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/(pharmacist)/dispense/${item._id}`)}
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

  const keyExtractor = useCallback((item: PendingPrescription) => item._id, []);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading prescriptions...</Text>
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity onPress={loadPending} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'top']}>
      <FlatList
        data={pending}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={pending.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingMoreText, { color: theme.textTertiary }]}>Loading more...</Text>
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
  loadingText: { fontSize: 14, marginTop: spacing.sm },
  footerLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  loadingMoreText: { fontSize: 13 },
  error: { fontSize: 15, marginBottom: spacing.md },
  retryBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});