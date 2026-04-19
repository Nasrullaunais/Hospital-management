import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';
import { prescriptionService } from '../../prescriptions/services/prescription.service';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

interface DispenseItem {
  medicineId: string | { _id: string; stockQuantity?: number; name?: string };
  medicineName: string;
  dosage: string;
  quantity: number;
  instructions?: string;
}

interface Prescription {
  _id: string;
  patientId: string | { _id: string; name?: string };
  doctorId: string | { _id: string; userId?: { name?: string } };
  items: DispenseItem[];
  status: string;
  createdAt: string;
}

export default function DispenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [medicineStocks, setMedicineStocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dispensed, setDispensed] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    prescriptionService.getPrescriptionById(id)
      .then((rx: Prescription) => {
        setPrescription(rx);
        // Initialize dispensed quantities with prescribed amounts
        const init: Record<string, number> = {};
        rx.items.forEach((item: DispenseItem) => {
          const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
          init[medId] = item.quantity;
        });
        setDispensed(init);
      })
      .catch(() => Alert.alert('Error', 'Failed to load prescription'))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch stock quantities for all medicines in the prescription
  useEffect(() => {
    if (!prescription) return;

    const fetchStocks = async () => {
      const stocks: Record<string, number> = {};
      for (const item of prescription.items) {
        const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
        try {
          // If medicineId is populated with stockQuantity, use that
          if (typeof item.medicineId === 'object' && item.medicineId.stockQuantity !== undefined) {
            stocks[medId] = item.medicineId.stockQuantity;
          } else {
            // Otherwise fetch medicine details from server
            const med = await medicineService.getMedicineById(medId);
            stocks[medId] = med.stockQuantity ?? 0;
          }
        } catch {
          stocks[medId] = 0;
        }
      }
      setMedicineStocks(stocks);
    };

    fetchStocks();
  }, [prescription]);

  const handleDispense = useCallback(() => {
    if (!prescription) return;

    // Client-side validation: check if any item exceeds stock
    const overStockItems = prescription.items.filter((item: DispenseItem) => {
      const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
      const stock = medicineStocks[medId] ?? 0;
      const toDispense = dispensed[medId] || 0;
      return toDispense > stock;
    });

    if (overStockItems.length > 0) {
      const names = overStockItems.map((i: DispenseItem) => i.medicineName).join(', ');
      Alert.alert('Insufficient Stock', `The following medicines exceed available stock: ${names}. Please adjust quantities.`);
      return;
    }

    // Confirmation dialog before fulfilling
    Alert.alert(
      'Confirm Dispensing',
      'Are you sure you want to fulfill this prescription? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fulfill',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const items = prescription.items.map((item: DispenseItem) => {
                const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
                return {
                  medicineId: medId,
                  quantityDispensed: dispensed[medId] || 0,
                };
              });
              await dispensingService.dispensePrescription(id!, items);
              Alert.alert('Success', 'Prescription fulfilled successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : 'Failed to dispense prescription';
              Alert.alert('Error', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [prescription, dispensed, id, router, medicineStocks]);

  const handleAdjust = useCallback((medicineId: string, delta: number) => {
    setDispensed((d) => ({
      ...d,
      [medicineId]: Math.max(0, (d[medicineId] || 0) + delta),
    }));
  }, []);

  // Calculate total prescribed vs dispensed
  const totalStats = useMemo(() => {
    if (!prescription) return { prescribed: 0, dispensing: 0 };
    const prescribed = prescription.items.reduce((sum: number, item: DispenseItem) => sum + item.quantity, 0);
    const dispensing = Object.values(dispensed).reduce((sum, val) => sum + val, 0);
    return { prescribed, dispensing };
  }, [prescription, dispensed]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading prescription...</Text>
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>Prescription not found</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const patientName =
    typeof prescription.patientId === 'object' ? prescription.patientId?.name : 'Patient';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Patient Info Card */}
      <View style={[styles.patientCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.patientHeader}>
          <View>
            <Text style={[styles.patientLabel, { color: theme.textSecondary }]}>Patient</Text>
            <Text style={[styles.patientName, { color: theme.text }]}>{patientName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
            <Text style={[styles.statusText, { color: theme.warning }]}>PENDING</Text>
          </View>
        </View>
        <Text style={[styles.dateText, { color: theme.textTertiary }]}>
          Issued: {new Date(prescription.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Summary Stats */}
      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>{totalStats.prescribed}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total Prescribed</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.success }]}>{totalStats.dispensing}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>To Dispense</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Medicines to Dispense</Text>

      {prescription.items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="inbox" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No items in this prescription</Text>
        </View>
      ) : (
        prescription.items.map((item: DispenseItem) => {
          const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
          const stock = medicineStocks[medId] ?? 0;
          const currentDispensed = dispensed[medId] || 0;
          const isLowStock = stock < item.quantity;
          const isOverStock = currentDispensed > stock;

          return (
            <View
              key={medId}
              style={[
                styles.itemCard,
                { backgroundColor: theme.surface, borderColor: isOverStock ? theme.error : theme.border },
              ]}
            >
              <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.medicineName, { color: theme.text }]}>{item.medicineName}</Text>
                  {isLowStock && !isOverStock && (
                    <View style={[styles.lowStockBadge, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
                      <Text style={[styles.lowStockText, { color: theme.error }]}>Low Stock</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.dosage, { color: theme.textSecondary }]}>
                  {item.dosage}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={[styles.prescribedText, { color: theme.textSecondary }]}>
                    Prescribed: {item.quantity}
                  </Text>
                  <Text style={[styles.stockText, { color: isOverStock ? theme.error : theme.textSecondary }]}>
                    Stock: {stock} available
                  </Text>
                </View>
                {item.instructions && (
                  <Text style={[styles.instructions, { color: theme.textTertiary }]}>
                    {item.instructions}
                  </Text>
                )}
              </View>
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    { backgroundColor: theme.primary, opacity: currentDispensed <= 0 ? 0.4 : 1 },
                  ]}
                  onPress={() => handleAdjust(medId, -1)}
                  disabled={currentDispensed <= 0}
                  activeOpacity={0.7}
                >
                  <Text style={styles.adjustBtnText}>−</Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.qty,
                    { color: isOverStock ? theme.error : theme.text },
                    isOverStock && styles.qtyOver,
                  ]}
                >
                  {currentDispensed}
                </Text>
                <TouchableOpacity
                  style={[styles.adjustBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handleAdjust(medId, 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.adjustBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: theme.success },
          (submitting || prescription.items.length === 0) && { opacity: 0.6 },
        ]}
        onPress={handleDispense}
        disabled={submitting || prescription.items.length === 0}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.submitBtnContent}>
            <Feather name="check-circle" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Fulfill Prescription</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm },
  errorText: { marginTop: spacing.sm },
  retryBtn: { marginTop: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  patientCard: {
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  patientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  patientName: { fontSize: 18, fontWeight: '700', marginTop: spacing.xs },
  statusBadge: { borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dateText: { fontSize: 13, marginTop: spacing.sm },
  summaryCard: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, marginVertical: spacing.xs },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyCard: {
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyText: { marginTop: spacing.sm },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  itemInfo: { flex: 1, paddingRight: spacing.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  medicineName: { fontSize: 15, fontWeight: '600' },
  lowStockBadge: { borderWidth: 1, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.sm },
  lowStockText: { fontSize: 10, fontWeight: '700' },
  dosage: { fontSize: 13, marginBottom: spacing.xs },
  itemMeta: { flexDirection: 'row', gap: spacing.md },
  prescribedText: { fontSize: 12 },
  stockText: { fontSize: 12 },
  instructions: { fontSize: 12, fontStyle: 'italic', marginTop: spacing.xs },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  adjustBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  adjustBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  qty: { fontSize: 18, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  qtyOver: { textDecorationLine: 'underline' },
  submitBtn: {
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    ...shadows.button,
  },
  submitBtnContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});