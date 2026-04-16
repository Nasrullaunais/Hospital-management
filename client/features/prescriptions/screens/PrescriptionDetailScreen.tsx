import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { prescriptionService, type Prescription } from '../services/prescription.service';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    prescriptionService.getPrescriptionById(id)
      .then(setPrescription)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!prescription) return <View style={styles.center}><Text>Prescription not found</Text></View>;

  const doctorName = typeof prescription.doctorId === 'object' ? prescription.doctorId?.userId?.name : 'Doctor';
  const doctorSpec = typeof prescription.doctorId === 'object' ? prescription.doctorId?.specialization : '';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prescription Details</Text>
        <View style={[styles.statusBadge, prescription.status === 'active' && styles.statusActive, prescription.status === 'fulfilled' && styles.statusFulfilled]}>
          <Text style={styles.statusText}>{prescription.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doctor</Text>
        <Text style={styles.doctorName}>Dr. {doctorName}</Text>
        {doctorSpec && <Text style={styles.specialty}>{doctorSpec}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <Text style={styles.date}>{new Date(prescription.createdAt).toLocaleDateString()} at {new Date(prescription.createdAt).toLocaleTimeString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicines ({prescription.items.length})</Text>
        {prescription.items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <Text style={styles.medicineName}>{item.medicineName}</Text>
            <Text style={styles.dosage}>{item.dosage}</Text>
            <View style={styles.itemDetails}>
              <Text style={styles.detailText}>Qty: {item.quantity}</Text>
              {item.instructions && <Text style={styles.instructions}>💊 {item.instructions}</Text>}
            </View>
          </View>
        ))}
      </View>

      {prescription.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{prescription.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  section: { backgroundColor: '#fff', padding: 16, marginTop: 12, marginHorizontal: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  doctorName: { fontSize: 17, fontWeight: '600', color: '#333' },
  specialty: { fontSize: 14, color: '#666', marginTop: 2 },
  date: { fontSize: 15, color: '#555' },
  itemCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  medicineName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  dosage: { fontSize: 15, color: '#2196F3', fontWeight: '500', marginBottom: 4 },
  itemDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { fontSize: 14, color: '#666' },
  instructions: { fontSize: 14, color: '#4CAF50', fontStyle: 'italic' },
  notes: { fontSize: 15, color: '#555', fontStyle: 'italic', lineHeight: 22 },
  error: { color: '#e53935', fontSize: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: '#e3f2fd' },
  statusFulfilled: { backgroundColor: '#e8f5e9' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#555' },
});
