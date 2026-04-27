import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { prescriptionService, type Prescription } from '../services/prescription.service';
import { useAuth } from '@/shared/context/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { TAB_BAR_HEIGHT } from '@/shared/constants/Config';
import { getPrescriptionStatusStyle } from '@/shared/utils/statusStyles';

export default function PrescriptionListScreen() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const loadPrescriptions = useCallback(async () => {
    try {
      setError(null);
      if (!user?._id) return;
      const data = await prescriptionService.getMyPrescriptions(user._id);
      setPrescriptions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load prescriptions.');
      console.error('loadPrescriptions failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPrescriptions();
  }, [loadPrescriptions]);

  const renderPrescription = useCallback(({ item }: { item: Prescription }) => {
    const doctorName = item.doctorId && typeof item.doctorId === 'object' ? item.doctorId?.userId?.name : 'Doctor';
    const statusStyle = getPrescriptionStatusStyle(item.status, theme);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/(patient)/prescriptions/${String(item._id)}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.doctorRow}>
          <Feather name="user" size={16} color={theme.textSecondary} style={{ marginRight: spacing.xs }} />
          <Text style={[styles.doctor, { color: theme.text }]}>Dr. {doctorName}</Text>
        </View>
        <View style={styles.itemsRow}>
          <Feather name="package" size={14} color={theme.textTertiary} style={{ marginRight: spacing.xs }} />
          <Text style={[styles.items, { color: theme.textSecondary }]}>{item.items.length} medicine(s) prescribed</Text>
        </View>
      </TouchableOpacity>
    );
  }, [theme, router]);

  const keyExtractor = useCallback((item: Prescription) => item._id, []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="clipboard" size={64} color={theme.textTertiary} />
      <Text style={[styles.empty, { color: theme.textSecondary }]}>No prescriptions found</Text>
    </View>
  ), [theme]);

  if (loading) return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={prescriptions}
        keyExtractor={keyExtractor}
        renderItem={renderPrescription}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={prescriptions.length === 0 ? styles.emptyListContainer : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.md },
  emptyListContainer: { flexGrow: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  date: { fontSize: 13 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  doctor: { fontSize: 17, fontWeight: '600' },
  itemsRow: { flexDirection: 'row', alignItems: 'center' },
  items: { fontSize: 14 },
  empty: { textAlign: 'center', marginTop: spacing.md, fontSize: 16 },
  error: { fontSize: 15, marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.lg },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '600' },
});