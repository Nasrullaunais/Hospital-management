import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { prescriptionService, type Prescription } from '../services/prescription.service';
import { spacing, radius } from '@/constants/ThemeTokens';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    prescriptionService.getPrescriptionById(id)
      .then(setPrescription)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load prescription.';
        console.error('getPrescriptionById failed:', err);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
  if (error) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
    </View>
  );
  if (!prescription) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.textSecondary }}>Prescription not found</Text>
    </View>
  );

  const getDoctorName = (doc: Prescription['doctorId']): string => {
    if (doc && typeof doc === 'object' && doc.userId?.name) return doc.userId.name;
    console.warn('PrescriptionDetailScreen: doctor name incomplete for prescription', prescription?._id);
    return 'Doctor';
  };
  const getDoctorSpec = (doc: Prescription['doctorId']): string => {
    if (doc && typeof doc === 'object' && doc.specialization) return doc.specialization;
    return '';
  };
  const normalizeStatus = (s: string): string => s.toLowerCase();
  const doctorName = getDoctorName(prescription.doctorId);
  const doctorSpec = getDoctorSpec(prescription.doctorId);
  const statusKey = normalizeStatus(prescription.status);
  const statusActive = statusKey === 'active';
  const statusFulfilled = statusKey === 'fulfilled';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Prescription Details</Text>
        <View style={[styles.statusBadge, statusActive && { backgroundColor: theme.infoBg }, statusFulfilled && { backgroundColor: theme.successBg }]}>
          <Text style={[styles.statusText, { color: statusActive ? theme.info : theme.success }]}>{prescription.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Doctor</Text>
        <Text style={[styles.doctorName, { color: theme.text }]}>Dr. {doctorName}</Text>
        {doctorSpec && <Text style={[styles.specialty, { color: theme.textSecondary }]}>{doctorSpec}</Text>}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Date</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>
          {new Date(prescription.createdAt).toLocaleDateString()} at {new Date(prescription.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Medicines ({prescription.items.length})</Text>
        {prescription.items.map((item, idx) => (
          <View key={item._id ?? item.medicineId ?? idx} style={[styles.itemCard, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.medicineName, { color: theme.text }]}>{item.medicineName}</Text>
            <Text style={[styles.dosage, { color: theme.primary }]}>{item.dosage}</Text>
            <View style={styles.itemDetails}>
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>Qty: {item.quantity}</Text>
              {item.instructions && <Text style={[styles.instructions, { color: theme.success }]}>💊 {item.instructions}</Text>}
            </View>
          </View>
        ))}
      </View>

      {prescription.notes && (
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>Notes</Text>
          <Text style={[styles.notes, { color: theme.textSecondary }]}>{prescription.notes}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  section: { padding: 16, marginTop: 12, marginHorizontal: 16, borderRadius: radius.lg },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  doctorName: { fontSize: 17, fontWeight: '600' },
  specialty: { fontSize: 14, marginTop: 2 },
  date: { fontSize: 15 },
  itemCard: { paddingVertical: 12, borderBottomWidth: 1 },
  medicineName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  dosage: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  itemDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailText: { fontSize: 14 },
  instructions: { fontSize: 14, fontStyle: 'italic' },
  notes: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  error: { fontSize: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.lg },
  statusText: { fontSize: 12, fontWeight: '700' },
});
