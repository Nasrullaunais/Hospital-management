import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { invoiceService } from '../services/invoice.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice, PaymentStatus } from '@/shared/types';

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string }> = {
  Unpaid: { bg: '#fee2e2', text: '#991b1b' },
  'Pending Verification': { bg: '#fef9c3', text: '#854d0e' },
  Paid: { bg: '#dcfce7', text: '#166534' },
};

/**
 * InvoiceListScreen — Member 6
 * Lists all invoices for the authenticated patient (or all invoices for admins).
 * TODO: Navigate to PaymentScreen on pressing an Unpaid invoice.
 * TODO: Admin: filter by paymentStatus or patientId.
 * TODO: Admin: add verify-payment button directly on each card.
 */
export default function InvoiceListScreen() {
  const { user } = useAuth();
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

  const handleAdminVerify = async (id: string) => {
    Alert.alert('Verify Payment', 'Mark this invoice as Paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try {
            const updated = await invoiceService.verifyPayment(id);
            setInvoices((prev) => prev.map((i) => (i._id === id ? updated : i)));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Verification failed.');
          }
        },
      },
    ]);
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const colors = STATUS_STYLES[item.paymentStatus];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.amount}>${item.totalAmount.toFixed(2)}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.paymentStatus}</Text>
          </View>
        </View>

        <Text style={styles.date}>
          Issued: {new Date(item.issuedDate).toLocaleDateString()}
        </Text>

        {item.appointmentId && (
          <Text style={styles.meta}>
            Appointment: {typeof item.appointmentId === 'string' ? item.appointmentId : item.appointmentId._id}
          </Text>
        )}

        <View style={styles.actions}>
          {/* Patient: pay unpaid invoices */}
          {!isAdmin && item.paymentStatus === 'Unpaid' && (
            <TouchableOpacity style={styles.payButton}>
              {/* TODO: Navigate to PaymentScreen with invoiceId */}
              <Text style={styles.payButtonText}>Upload Receipt</Text>
            </TouchableOpacity>
          )}

          {/* Admin: verify pending invoices */}
          {isAdmin && item.paymentStatus === 'Pending Verification' && (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => handleAdminVerify(item._id)}
            >
              <Text style={styles.verifyButtonText}>Verify Payment</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, paddingTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  amount: { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 12, color: '#888', marginBottom: 2 },
  meta: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  actions: { marginTop: 12 },
  payButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  verifyButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verifyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});
