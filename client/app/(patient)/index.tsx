import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function PatientDashboard() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Patient Dashboard</Text>
      <Text style={styles.subtitle}>Manage appointments, records, and billing from one place.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(patient)/appointments/book')}>
          <Text style={styles.primaryButtonText}>Book Appointment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(patient)/doctors')}>
          <Text style={styles.secondaryButtonText}>Browse Doctors</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity style={styles.tile} onPress={() => router.push('/(patient)/records')}>
          <Text style={styles.tileLabel}>Medical Records</Text>
          <Text style={styles.tileSub}>View diagnosis and reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} onPress={() => router.push('/(patient)/billing')}>
          <Text style={styles.tileLabel}>Billing</Text>
          <Text style={styles.tileSub}>Upload receipts and track payments</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#2563eb', fontWeight: '700' },
  gridRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  tileLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  tileSub: { fontSize: 12, color: '#64748b' },
});
