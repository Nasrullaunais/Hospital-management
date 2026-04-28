import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { InvoiceCard } from '@/features/billing/components';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { TAB_BAR_HEIGHT } from '@/shared/constants/Config';

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setError(null);
      const data = isAdmin
        ? await invoiceService.getAllInvoices()
        : await invoiceService.getMyBills();
      setInvoices(data);
    } catch (err: unknown) {
      console.error('fetchInvoices failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    fetchInvoices()
      .catch(() => {})
      .then(() => setLoading(false));
  }, [fetchInvoices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  }, [fetchInvoices]);

  const handleInvoiceUpdate = (updated: Invoice & { _deleted?: boolean }) => {
    if (updated._deleted) {
      setInvoices((prev) => prev.filter((i) => i._id !== updated._id));
    } else {
      setInvoices((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <InvoiceCard invoice={item} isAdmin={isAdmin} onUpdate={handleInvoiceUpdate} />
  );

  if (loading && invoices.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity
            onPress={fetchInvoices}
            style={[styles.retryButton, { borderColor: theme.primary }]}
          >
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.surfaceTertiary }]}
    >
      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoice}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListHeaderComponent={
          <Text style={[styles.header, { color: theme.text }]}>
            {isAdmin ? 'All Invoices' : 'My Bills'}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="file-text" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No invoices found.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  header: { fontSize: 22, fontWeight: '700', marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  errorText: { fontSize: 15, marginBottom: spacing.sm },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  retryText: { fontWeight: '600', fontSize: 15 },
  emptyContent: { justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 16 },
});
