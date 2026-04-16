import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function DoctorDashboard() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Doctor Dashboard</Text>
      <Text style={styles.subtitle}>Review your schedule and maintain patient records quickly.</Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Today</Text>
        <Text style={styles.panelBody}>Open your schedule and keep appointments up to date.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(doctor)/appointments')}>
          <Text style={styles.primaryButtonText}>Open My Schedule</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity style={styles.tile} onPress={() => router.push('/(doctor)/records/add-record')}>
          <Text style={styles.tileLabel}>Create Record</Text>
          <Text style={styles.tileSub}>Add diagnosis and lab attachments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} onPress={() => router.push('/(doctor)/records')}>
          <Text style={styles.tileLabel}>Patient Logs</Text>
          <Text style={styles.tileSub}>Review created records</Text>
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
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  panelBody: { fontSize: 13, color: '#475569' },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
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
