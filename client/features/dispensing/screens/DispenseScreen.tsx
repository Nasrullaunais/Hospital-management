import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';
import { prescriptionService } from '../../prescriptions/services/prescription.service';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD } from '@/shared/constants/pharmacy';
import type { PendingPrescription, PrescriptionItem } from '@/shared/types';

// Number of retry attempts for stock fetch failures
// 2 retries = 3 total attempts (initial + 2 retries)
const STOCK_FETCH_RETRIES = 2;

export default function DispenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [prescription, setPrescription] = useState<PendingPrescription | null>(null);
  const [medicineStocks, setMedicineStocks] = useState<Record<string, number>>({});
  const [stockFetchError, setStockFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dispensed, setDispensed] = useState<Record<string, number>>({});
  const [isMounted, setIsMounted] = useState(true);
  const router = useRouter();

  // Ref to always access current medicineStocks without closure staleness
  const medicineStocksRef = useRef(medicineStocks);
  medicineStocksRef.current = medicineStocks;

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!id) return;
    prescriptionService.getPrescriptionById(id)
      .then((rx: PendingPrescription) => {
        if (!isMounted) return;
        setPrescription(rx);
        const init: Record<string, number> = {};
        rx.items.forEach((item: PrescriptionItem) => {
          const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
          init[medId] = item.quantity;
        });
        setDispensed(init);
      })
      .catch(() => {
        if (!isMounted) return;
        Alert.alert('Error', 'Failed to load prescription');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
  }, [id, prescriptionService, isMounted]);

  useEffect(() => {
    if (!prescription || !id) return;

    const medIds = prescription.items.map((item: PrescriptionItem) =>
      typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId,
    );

    let cancelled = false;

    const fetchWithRetry = async (ids: string[], attempt = 0): Promise<Record<string, number>> => {
      try {
        const meds = await medicineService.getMedicinesByIds(ids);
        if (cancelled) return {};
        const stocks: Record<string, number> = {};
        meds.forEach((med) => {
          stocks[med._id] = med.stockQuantity ?? 0;
        });
        ids.forEach((id) => {
          if (stocks[id] === undefined) {
            stocks[id] = -1;
          }
        });
        return stocks;
      } catch {
        if (cancelled) return {};
        if (attempt < STOCK_FETCH_RETRIES) {
          return fetchWithRetry(ids, attempt + 1);
        }
        const failed: Record<string, number> = {};
        ids.forEach((id) => { failed[id] = -1; });
        return failed;
      }
    };

    fetchWithRetry(medIds)
      .then((stocks) => {
        if (cancelled || !isMounted) return;
        setMedicineStocks(stocks);
        const hasFailures = Object.values(stocks).some((s) => s === -1);
        setStockFetchError(hasFailures);
        if (hasFailures) {
          Alert.alert('Stock Unavailable', 'Some medicine stock information could not be loaded. Please try again later.');
        }
      })
      .catch(() => {
        if (cancelled || !isMounted) return;
        setStockFetchError(true);
        Alert.alert('Stock Error', 'Failed to fetch stock information. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [id, prescription]);

  const handleDispense = useCallback(() => {
    if (!prescription) return;

    const currentStocks = medicineStocksRef.current;
    const overStockItems = prescription.items.filter((item: PrescriptionItem) => {
      const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
      const rawStock = currentStocks[medId] ?? 0;
      if (rawStock === -1) return false;
      const toDispense = dispensed[medId] || 0;
      return toDispense > rawStock;
    });

    if (overStockItems.length > 0) {
      const names = overStockItems.map((i: PrescriptionItem) => i.medicineName).join(', ');
      Alert.alert('Insufficient Stock', `The following medicines exceed available stock: ${names}. Please adjust quantities.`);
      return;
    }

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
              const items = prescription.items.map((item: PrescriptionItem) => {
                const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
                return {
                  medicineId: medId,
                  medicineName: item.medicineName,
                  quantityDispensed: dispensed[medId] || 0,
                };
              });
              await dispensingService.dispensePrescription(id!, items);
              Alert.alert('Success', 'Prescription fulfilled successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: unknown) {
              console.error('[DispenseScreen] handleDispense error:', e);
              const message = e instanceof Error ? e.message : 'Failed to dispense prescription';
              Alert.alert('Error', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [prescription, dispensed, id, router]);

  const handleAdjust = useCallback((medicineId: string, delta: number, maxStock?: number) => {
    setDispensed((d) => {
      const current = d[medicineId] || 0;
      const newVal = Math.max(0, current + delta);
      if (maxStock !== undefined && maxStock >= 0 && newVal > maxStock) {
        return { ...d, [medicineId]: maxStock };
      }
      return { ...d, [medicineId]: newVal };
    });
  }, []);

  // Calculate total prescribed vs dispensed
  const totalStats = useMemo(() => {
    if (!prescription) return { prescribed: 0, dispensing: 0 };
    const prescribed = prescription.items.reduce((sum: number, item: PrescriptionItem) => sum + item.quantity, 0);
    const dispensing = Object.values(dispensed).reduce((sum, val) => sum + val, 0);
    return { prescribed, dispensing };
  }, [prescription, dispensed]);

  const stocksLoaded = useMemo(() => Object.keys(medicineStocks).length > 0, [medicineStocks]);

  const canSubmit = useMemo(() => {
    if (!prescription || prescription.items.length === 0) return false;
    if (!stocksLoaded) return false;
    const allFailed = prescription.items.every((item: PrescriptionItem) => {
      const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
      return medicineStocks[medId] === -1;
    });
    if (allFailed) return false;
    return true;
  }, [prescription, stocksLoaded, medicineStocks]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.center, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading prescription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!prescription) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
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
      </SafeAreaView>
    );
  }

  const patientName =
    typeof prescription.patientId === 'object' ? prescription.patientId?.name : 'Patient';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'top']}>
      <ScrollView
        style={styles.container}
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

      {!stocksLoaded && prescription.items.length > 0 && (
        <View style={[styles.skeletonCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.skeletonLine, { backgroundColor: theme.surfaceTertiary }]} />
          <View style={[styles.skeletonLineShort, { backgroundColor: theme.surfaceTertiary }]} />
          <View style={[styles.skeletonLineShort, { backgroundColor: theme.surfaceTertiary }]} />
        </View>
      )}

      {prescription.items.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="inbox" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No items in this prescription</Text>
        </View>
      ) : (
        prescription.items.map((item: PrescriptionItem, index: number) => {
          const medId = typeof item.medicineId === 'object' ? item.medicineId._id : item.medicineId;
          const rawStock = medicineStocks[medId] ?? 0;
          const stockFetchFailed = rawStock === -1;
          const stock = stockFetchFailed ? 0 : rawStock;
          const currentDispensed = dispensed[medId] || 0;
          const isLowStock = !stockFetchFailed && stock < LOW_STOCK_THRESHOLD;
          const isOverStock = !stockFetchFailed && currentDispensed > stock;

          return (
            <View
              key={`${medId}-${index}`}
              style={[
                styles.itemCard,
                { backgroundColor: theme.surface, borderColor: isOverStock ? theme.error : theme.border },
              ]}
            >
              <View style={styles.itemInfo}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.medicineName, { color: theme.text }]}>{item.medicineName}</Text>
                  {stockFetchFailed && (
                    <View style={[styles.lowStockBadge, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
                      <Text style={[styles.lowStockText, { color: theme.error }]}>Stock Unavailable</Text>
                    </View>
                  )}
                  {!stockFetchFailed && isLowStock && !isOverStock && (
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
                  <Text style={[styles.stockText, { color: stockFetchFailed ? theme.error : (isOverStock ? theme.error : theme.textSecondary) }]}>
                    {stockFetchFailed ? 'Unable to determine stock' : `Stock: ${stock} available`}
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
                  onPress={() => handleAdjust(medId, 1, stock >= 0 ? stock : undefined)}
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
          (submitting || !canSubmit) && { opacity: 0.6 },
        ]}
        onPress={handleDispense}
        disabled={submitting || !canSubmit}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
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
  skeletonCard: {
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  skeletonLine: { height: 16, borderRadius: radius.sm },
  skeletonLineShort: { height: 12, width: '60%', borderRadius: radius.sm },
});