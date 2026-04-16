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
import * as DocumentPicker from 'expo-document-picker';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice, PaymentStatus } from '@/shared/types';

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string }> = {
  Unpaid: { bg: '#fee2e2', text: '#991b1b' },
  'Pending Verification': { bg: '#fef9c3', text: '#854d0e' },
  Paid: { bg: '#dcfce7', text: '#166534' },
};

export default function BillingScreen() {
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

  const handleUploadReceipt = async (id: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      Alert.alert('Upload Confirmation', `Upload ${file.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            try {
              setLoading(true);
              const formData = new FormData();
              
              formData.append('paymentReceipt', {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream',
              } as any);

              const updated = await invoiceService.uploadPaymentReceipt(id, formData);
              setInvoices((prev) => prev.map((i) => (i._id === id ? updated : i)));
              Alert.alert('Success', 'Receipt uploaded successfully. Awaiting verification.');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Upload failed.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document.');
    }
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
          {!isAdmin && item.paymentStatus === 'Unpaid' && (
            <TouchableOpacity style={styles.payButton} onPress={() => handleUploadReceipt(item._id)}>
              <Text style={styles.payButtonText}>Upload Receipt</Text>
            </TouchableOpacity>
          )}

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
