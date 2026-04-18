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
import { SymbolView } from 'expo-symbols';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { InvoiceCard } from '@/features/billing/components';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function BillingScreen() {
  const { user } = useAuth();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices.');
    }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    fetchInvoices().finally(() => setLoading(false));
  }, [fetchInvoices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

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
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={fetchInvoices}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      {loading && invoices.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoice}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListHeaderComponent={
          <Text style={[styles.header, { color: theme.text }]}>{isAdmin ? 'All Invoices' : 'My Bills'}</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <SymbolView name={{ ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' }} tintColor={theme.textTertiary} size={48} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No invoices found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    padding: 8,
  },
  listContainer: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 22, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 },
  errorText: { fontSize: 15, marginBottom: 12 },
  retryText: { fontWeight: '600', fontSize: 15 },
  emptyContent: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 16 },
});
