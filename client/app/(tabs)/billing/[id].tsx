import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { invoiceService } from '@/features/billing/services/invoice.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { Invoice } from '@/shared/types';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      try {
        const invoices = await invoiceService.getAllInvoices();
        const found = invoices.find((inv) => inv._id === id);
        if (found) {
          setInvoice(found);
        } else {
          // Try patient bills
          const myBills = await invoiceService.getMyBills();
          const patientFound = myBills.find((inv) => inv._id === id);
          if (patientFound) {
            setInvoice(patientFound);
          } else {
            setError('Invoice not found');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const handleVerify = async () => {
    if (!invoice) return;
    Alert.alert('Verify Payment', 'Mark this invoice as Paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try {
            const updated = await invoiceService.verifyPayment(invoice._id);
            setInvoice(updated);
            Alert.alert('Success', 'Payment verified.');
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Verification failed.');
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    Alert.alert('Delete Invoice', 'Are you sure you want to delete this invoice?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await invoiceService.deleteInvoice(invoice._id);
            Alert.alert('Success', 'Invoice deleted.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed.');
          }
        },
      },
    ]);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Unpaid':
        return { bg: '#fee2e2', text: '#991b1b' };
      case 'Pending Verification':
        return { bg: '#fef9c3', text: '#854d0e' };
      case 'Paid':
        return { bg: '#dcfce7', text: '#166534' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Invoice not found'}</Text>
      </View>
    );
  }

  const statusStyle = getStatusStyle(invoice.paymentStatus);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.amount}>${invoice.totalAmount.toFixed(2)}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {invoice.paymentStatus}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Invoice ID</Text>
          <Text style={styles.value}>{invoice._id}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Issued Date</Text>
          <Text style={styles.value}>
            {new Date(invoice.issuedDate).toLocaleDateString()}
          </Text>
        </View>

        {invoice.appointmentId && (
          <View style={styles.section}>
            <Text style={styles.label}>Appointment</Text>
            <Text style={styles.value}>
              {typeof invoice.appointmentId === 'string'
                ? invoice.appointmentId
                : invoice.appointmentId._id}
            </Text>
          </View>
        )}

        {invoice.paymentReceiptUrl && (
          <View style={styles.section}>
            <Text style={styles.label}>Payment Receipt</Text>
            <Image
              source={{ uri: invoice.paymentReceiptUrl }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.actions}>
          {isAdmin && invoice.paymentStatus === 'Pending Verification' && (
            <View style={[styles.button, styles.verifyButton]} onTouchEnd={handleVerify}>
              <Text style={styles.verifyButtonText}>Verify Payment</Text>
            </View>
          )}

          {isAdmin && (
            <View style={[styles.button, styles.deleteButton]} onTouchEnd={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Invoice</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  amount: { fontSize: 32, fontWeight: '700', color: '#1a1a2e' },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 16 },
  label: { fontSize: 12, color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 16, color: '#1a1a2e', fontWeight: '500' },
  receiptImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#f3f4f6' },
  actions: { marginTop: 20, gap: 12 },
  button: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  verifyButton: { backgroundColor: '#059669' },
  verifyButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  deleteButton: { backgroundColor: '#ef4444' },
  deleteButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  errorText: { color: '#ef4444', fontSize: 16 },
});