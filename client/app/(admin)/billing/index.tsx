import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { InvoiceCard } from '@/features/billing/components';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice } from '@/shared/types';

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors[colorScheme].background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    padding: 10,
  },
  listContainer: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 22, fontWeight: '700', color: Colors[colorScheme].text, marginBottom: 12, paddingTop: 4 },
  createButton: {
    backgroundColor: Colors[colorScheme].primary,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  errorText: { fontSize: 15, marginBottom: 12 },
  retryText: { fontWeight: '600', fontSize: 15 },
  emptyText: { color: Colors[colorScheme].textTertiary, fontSize: 15, textAlign: 'center' },
});

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
      </View>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: Colors[colorScheme].error }]}>{error}</Text>
        <TouchableOpacity onPress={fetchInvoices}>
          <Text style={[styles.retryText, { color: Colors[colorScheme].primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {loading && invoices.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        </View>
      )}
      {isAdmin && (
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(admin)/billing/create')}>
          <Text style={styles.createButtonText}>+ Create Invoice</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoice}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={
          invoices.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        ListHeaderComponent={
          <Text style={styles.header}>{isAdmin ? 'All Invoices' : 'My Bills'}</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No invoices found.</Text>
        }
      />
    </SafeAreaView>
  );
}