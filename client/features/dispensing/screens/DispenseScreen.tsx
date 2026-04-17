import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';
import { prescriptionService } from '../../prescriptions/services/prescription.service';

export default function DispenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const handleDispense = async () => {
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
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  if (!prescription) return null;

  const patientName = typeof prescription.patientId === 'object' ? prescription.patientId?.name : 'Patient';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.patientCard}>
        <Text style={styles.patientLabel}>Patient</Text>
        <Text style={styles.patientName}>{patientName}</Text>
      </View>

      <Text style={styles.sectionTitle}>Medicines to Dispense</Text>

      {prescription.items.map((item: any) => {
        const stock = item.medicineId?.stockQuantity ?? 'N/A';
        const isOverStock = typeof stock === 'number' && dispensed[item.medicineId] > stock;
        return (
          <View key={item.medicineId} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.medicineName}>{item.medicineName}</Text>
              <Text style={styles.dosage}>{item.dosage} — Prescribed: {item.quantity}</Text>
              <Text style={[styles.stock, isOverStock && styles.stockWarning]}>
                Stock: {typeof stock === 'number' ? `${stock} available` : 'N/A'}
              </Text>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setDispensed(d => ({ ...d, [item.medicineId]: Math.max(0, (d[item.medicineId] || 0) - 1) }))}
              >
                <Text style={styles.adjustBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.qty, isOverStock && styles.qtyWarning]}>{dispensed[item.medicineId] || 0}</Text>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => setDispensed(d => ({ ...d, [item.medicineId]: (d[item.medicineId] || 0) + 1 }))}
              >
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleDispense}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>✓  Fulfill Prescription</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  patientCard: { backgroundColor: '#fff', padding: 20, marginHorizontal: 16, marginTop: 16, borderRadius: 12, elevation: 1 },
  patientLabel: { fontSize: 13, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  patientName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#555', marginHorizontal: 16, marginTop: 24, marginBottom: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, elevation: 1 },
  itemInfo: { flex: 1 },
  medicineName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  dosage: { fontSize: 14, color: '#666', marginBottom: 2 },
  stock: { fontSize: 13, color: '#888' },
  stockWarning: { color: '#e53935' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adjustBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 1 },
  adjustBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  qty: { fontSize: 20, fontWeight: '700', color: '#333', minWidth: 30, textAlign: 'center' },
  qtyWarning: { color: '#e53935' },
  submitBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 40, elevation: 2 },
  submitBtnDisabled: { backgroundColor: '#a5d6a7' },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
