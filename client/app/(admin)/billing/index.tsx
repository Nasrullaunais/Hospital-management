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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { InvoiceCard } from '@/features/billing/components';
import { useAuth } from '@/shared/context/AuthContext';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import type { Invoice } from '@/shared/types';

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors[colorScheme].surfaceTertiary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors[colorScheme].surface,
    opacity: 0.85,
    alignItems: 'center',
    padding: spacing.sm,
  },
  listContainer: { padding: spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  header: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: Colors[colorScheme].text,
    marginBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors[colorScheme].accent,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    height: 48,
    ...shadows.button,
  },
  createButtonText: { color: '#fff', fontWeight: typography.semibold, fontSize: typography.sm },
  errorText: { fontSize: typography.sm, marginBottom: spacing.sm },
  retryText: { fontWeight: typography.semibold, fontSize: typography.sm },
  emptyText: { color: Colors[colorScheme].textTertiary, fontSize: typography.sm, textAlign: 'center' },
});

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === ROLES.ADMIN;
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
    try {
      await fetchInvoices();
    } finally {
      setRefreshing(false);
    }
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
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.createButtonText}>Create Invoice</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item._id}
        renderItem={renderInvoice}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors[colorScheme].primary} />}
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