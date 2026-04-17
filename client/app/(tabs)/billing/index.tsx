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
import { useRouter } from 'expo-router';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { InvoiceCard } from '@/features/billing/components';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice } from '@/shared/types';

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

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
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && invoices.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchInvoices}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && invoices.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, paddingTop: 4 },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});