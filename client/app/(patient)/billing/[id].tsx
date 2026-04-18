import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { invoiceService } from '@/features/billing/services/invoice.service';
import type { Invoice } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PatientInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) return;
      try {
        const myBills = await invoiceService.getMyBills();
        const found = myBills.find((inv) => inv._id === id);
        if (found) {
          setInvoice(found);
        } else {
          setError('Invoice not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Unpaid':
        return { bg: theme.errorBg, text: theme.error };
      case 'Pending Verification':
        return { bg: theme.warningBg, text: theme.warning };
      case 'Paid':
        return { bg: theme.successBg, text: theme.success };
      default:
        return { bg: theme.surfaceTertiary, text: theme.textSecondary };
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error || 'Invoice not found'}</Text>
      </View>
    );
  }

  const statusStyle = getStatusStyle(invoice.paymentStatus);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <Text style={[styles.amount, { color: theme.text }]}>${invoice.totalAmount.toFixed(2)}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {invoice.paymentStatus}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textTertiary }]}>Invoice ID</Text>
          <Text style={[styles.value, { color: theme.text }]}>{invoice._id}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textTertiary }]}>Issued Date</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {new Date(invoice.issuedDate).toLocaleDateString()}
          </Text>
        </View>

        {invoice.appointmentId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Appointment</Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {typeof invoice.appointmentId === 'string'
                ? invoice.appointmentId
                : invoice.appointmentId._id}
            </Text>
          </View>
        )}

        {invoice.paymentReceiptUrl && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>Payment Receipt</Text>
            <Image
              source={{ uri: invoice.paymentReceiptUrl }}
              style={[styles.receiptImage, { backgroundColor: theme.surfaceTertiary }]}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
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
  },
  amount: { fontSize: 32, fontWeight: '700' },
  badge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
  value: { fontSize: 16, fontWeight: '500' },
  receiptImage: { width: '100%', height: 200, borderRadius: 8 },
  errorText: { fontSize: 16 },
});
