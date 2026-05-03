import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ROLES } from '@/shared/constants/roles';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { InvoiceCard, StatsCard } from '@/features/billing/components';
import { useAuth } from '@/shared/context/AuthContext';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import type { Invoice, PaymentStatus } from '@/shared/types';

type FilterOption = PaymentStatus | 'All';
const FILTER_OPTIONS: FilterOption[] = ['All', 'Unpaid', 'Pending Verification', 'Paid', 'Overdue'];

const FILTER_COLORS: Record<FilterOption, { chip: string; bg: string }> = {
  All: { chip: 'primary', bg: 'primaryMuted' },
  Unpaid: { chip: 'error', bg: 'errorBg' },
  'Pending Verification': { chip: 'warning', bg: 'warningBg' },
  Paid: { chip: 'success', bg: 'successBg' },
  Overdue: { chip: 'error', bg: 'errorBg' },
};

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors[colorScheme].surfaceTertiary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: Colors[colorScheme].surface, opacity: 0.85,
    alignItems: 'center', padding: spacing.sm,
  },
  listContainer: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  header: {
    fontSize: typography.xl, fontWeight: typography.bold,
    color: Colors[colorScheme].text, marginBottom: spacing.sm, paddingTop: spacing.xs,
  },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors[colorScheme].accent, marginHorizontal: spacing.md,
    marginTop: spacing.md, marginBottom: spacing.xs, borderRadius: radius.md, height: 48,
    ...shadows.button,
  },
  createButtonText: { color: '#fff', fontWeight: typography.semibold, fontSize: typography.sm },
  errorText: { fontSize: typography.sm, marginBottom: spacing.sm },
  retryText: { fontWeight: typography.semibold, fontSize: typography.sm },
  emptyText: { color: Colors[colorScheme].textTertiary, fontSize: typography.sm, textAlign: 'center' },
  filterContainer: { marginBottom: spacing.md },
  filterLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
});

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.RECEPTIONIST;
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchInvoices = useCallback(async (filter?: FilterOption) => {
    try {
      setError(null);
      let data: Invoice[];
      if (isStaff) {
        const filters = filter && filter !== 'All' ? { status: filter as PaymentStatus } : undefined;
        data = await invoiceService.getAllInvoices(filters);
      } else {
        data = await invoiceService.getMyBills();
      }
      setInvoices(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    }
  }, [isStaff]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await fetchInvoices(activeFilter);
    setLoading(false);
  }, [fetchInvoices, activeFilter]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const handleFilterChange = (filter: FilterOption) => {
    setActiveFilter(filter);
    fetchInvoices(filter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    try { await fetchInvoices(activeFilter); } finally { setRefreshing(false); }
  };

  const handleInvoiceUpdate = (updated: Invoice & { _deleted?: boolean }) => {
    if (updated._deleted) {
      setInvoices((prev) => (prev ?? []).filter((i) => i._id !== updated._id));
    } else {
      setInvoices((prev) => (prev ?? []).map((i) => (i._id === updated._id ? updated : i)));
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <InvoiceCard invoice={item} isAdmin={false} canManage={true} userRole="receptionist" onUpdate={handleInvoiceUpdate} />
  );

  const renderListHeader = () => (
    <View>
      <Text style={styles.header}>All Invoices</Text>
      {isStaff && <StatsCard key={refreshKey} />}
      {isStaff && (
        <View style={styles.filterContainer}>
          <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>FILTER BY STATUS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {FILTER_OPTIONS.map((option) => {
                const isActive = activeFilter === option;
                const chipInfo = FILTER_COLORS[option];
                const activeColor = theme[chipInfo.chip as keyof typeof theme] as string;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleFilterChange(option)}
                    activeOpacity={0.7}
                    style={[styles.chip, isActive
                      ? { backgroundColor: activeColor, borderColor: activeColor }
                      : { backgroundColor: 'transparent', borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#fff' : theme.textSecondary }]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  if (loading && invoices.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  if (error && invoices.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity onPress={() => fetchInvoices(activeFilter)}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      {loading && invoices.length > 0 && (
        <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={theme.primary} /></View>
      )}
      {isStaff && (
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(receptionist)/billing/create')}>
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.createButtonText}>Create Invoice</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoice}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No invoices found.</Text>}
      />
    </SafeAreaView>
  );
}
