import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { dispensingService } from '@/features/dispensing/services/dispensing.service';
import type { DispenseRecord } from '@/features/dispensing/services/dispensing.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';

export default function PatientDispenseHistoryScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [records, setRecords] = useState<DispenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (!patientId) return;
    try {
      setError(null);
      if (isRefresh) setRefreshing(true);
      const data = await dispensingService.getPatientDispenseHistory(patientId);
      setRecords(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dispensing history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const onRefresh = useCallback(() => { loadHistory(true); }, [loadHistory]);

  const getStatusVariant = (status: DispenseRecord['status']): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'fulfilled': return 'success';
      case 'partial': return 'warning';
      case 'cancelled': return 'error';
      default: return 'error';
    }
  };

  const getStatusLabel = (status: DispenseRecord['status']) => {
    switch (status) {
      case 'fulfilled': return 'FULFILLED';
      case 'partial': return 'PARTIAL';
      case 'cancelled': return 'CANCELLED';
      default: return status.toUpperCase();
    }
  };

  const renderItem = useCallback(({ item }: { item: DispenseRecord }) => {
    const pharmacistName = item.pharmacistId && typeof item.pharmacistId === 'object'
      ? item.pharmacistId.name ?? 'Pharmacist'
      : 'Pharmacist';

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, ...shadows.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Feather name="calendar" size={14} color={theme.textTertiary} />
            <Text style={[styles.dateText, { color: theme.textTertiary }]}>
              {new Date(item.fulfilledAt).toLocaleDateString()}
            </Text>
          </View>
        <View style={[styles.statusBadge, {
          backgroundColor: theme[getStatusVariant(item.status) + 'Bg'] as string,
          borderColor: theme[getStatusVariant(item.status)] as string,
        }]}>
            <Text style={[styles.statusText, { color: theme[getStatusVariant(item.status)] as string }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.medicineSection}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MEDICINES DISPENSED</Text>
          {item.dispensedItems.map((disp, idx) => (
            <View key={disp.medicineId ?? idx} style={[styles.medicineRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={styles.medicineInfo}>
                <Text style={[styles.medicineName, { color: theme.text }]}>{disp.medicineName}</Text>
                {disp.dosage && (
                  <Text style={[styles.dosage, { color: theme.textSecondary }]}>{disp.dosage}</Text>
                )}
              </View>
              <View style={styles.quantityBadge}>
                <Text style={[styles.quantityText, { color: theme.primary }]}>
                  {disp.quantityDispensed}{disp.quantityPrescribed !== disp.quantityDispensed ? `/${disp.quantityPrescribed}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <Feather name="user" size={14} color={theme.textTertiary} />
          <Text style={[styles.pharmacistText, { color: theme.textTertiary }]}>
            Dispensed by {pharmacistName}
          </Text>
        </View>
      </View>
    );
  }, [theme]);

  const keyExtractor = useCallback((item: DispenseRecord) => item._id, []);

  const ListHeaderComponent = useCallback(() => (
    <View style={[styles.headerBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Dispensing History</Text>
      <View style={styles.placeholder} />
    </View>
  ), [theme, router]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Feather name="archive" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No dispensing history</Text>
      <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>
        No records found for this patient
      </Text>
    </View>
  ), [theme]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={() => loadHistory()} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={records}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={records.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
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
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  placeholder: { width: 32 },
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateText: { fontSize: 13 },
  statusBadge: { borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  medicineSection: { marginBottom: spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
  medicineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  medicineInfo: { flex: 1 },
  medicineName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  dosage: { fontSize: 13 },
  quantityBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  quantityText: { fontSize: 13, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  pharmacistText: { fontSize: 13 },
  emptyText: { fontSize: typography.md, fontWeight: '600', marginTop: spacing.sm },
  emptySubText: { fontSize: typography.sm, marginTop: spacing.xs },
  loadingText: { fontSize: typography.sm, marginTop: spacing.sm },
  errorText: { fontSize: 15, marginBottom: spacing.md },
  retryBtn: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
