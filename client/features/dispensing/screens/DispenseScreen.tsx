import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';
import { prescriptionService } from '../../prescriptions/services/prescription.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function DispenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dispensed, setDispensed] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    prescriptionService.getPrescriptionById(id)
      .then((rx) => {
        setPrescription(rx);
        const init: Record<string, number> = {};
        rx.items.forEach((item: any) => { init[item.medicineId] = item.quantity; });
        setDispensed(init);
      })
      .catch(() => Alert.alert('Error', 'Failed to load prescription'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDispense = useCallback(async () => {
    if (!prescription) return;
    try {
      setSubmitting(true);
      const items = prescription.items.map((item: any) => ({
        medicineId: item.medicineId,
        quantityDispensed: dispensed[item.medicineId] || 0
      }));
      await dispensingService.dispensePrescription(id!, items);
      Alert.alert('Success', 'Prescription fulfilled successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }, [prescription, dispensed, id, router]);

  const handleAdjust = useCallback((medicineId: string, delta: number) => {
    setDispensed(d => ({
      ...d,
      [medicineId]: Math.max(0, (d[medicineId] || 0) + delta)
    }));
  }, []);

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );

  if (!prescription) return null;

  const patientName = typeof prescription.patientId === 'object' ? prescription.patientId?.name : 'Patient';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.patientCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.patientLabel, { color: theme.textSecondary }]}>Patient</Text>
        <Text style={[styles.patientName, { color: theme.text }]}>{patientName}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Medicines to Dispense</Text>

      {prescription.items.map((item: any) => {
        const stock = item.medicineId?.stockQuantity ?? 'N/A';
        const currentDispensed = dispensed[item.medicineId] || 0;
        const isOverStock = typeof stock === 'number' && currentDispensed > stock;

        return (
          <View key={item.medicineId} style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.medicineName, { color: theme.text }]}>{item.medicineName}</Text>
              <Text style={[styles.dosage, { color: theme.textSecondary }]}>{item.dosage} — Prescribed: {item.quantity}</Text>
              <Text style={[styles.stock, isOverStock && { color: theme.error }]}>
                Stock: {typeof stock === 'number' ? `${stock} available` : 'N/A'}
              </Text>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleAdjust(item.medicineId, -1)}
                activeOpacity={0.7}
              >
                <Text style={styles.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.qty, { color: isOverStock ? theme.error : theme.text }]}>{currentDispensed}</Text>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleAdjust(item.medicineId, 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: theme.success }, submitting && { opacity: 0.6 }]}
        onPress={handleDispense}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>Fulfill Prescription</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  patientCard: {
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  patientLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  patientName: { fontSize: 20, fontWeight: '700', marginTop: spacing.xs },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md },
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
  itemInfo: { flex: 1 },
  medicineName: { fontSize: 16, fontWeight: '600', marginBottom: spacing.xs },
  dosage: { fontSize: 14, marginBottom: spacing.xs },
  stock: { fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  adjustBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  adjustBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  qty: { fontSize: 20, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  submitBtn: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    ...shadows.button,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});