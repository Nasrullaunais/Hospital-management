import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>Control users, finance operations, and inventory governance.</Text>

      <View style={styles.gridRow}>
        <TouchableOpacity style={styles.tile} onPress={() => router.push('/(admin)/doctors/add')}>
          <Text style={styles.tileLabel}>Add Doctor</Text>
          <Text style={styles.tileSub}>Create a new doctor profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} onPress={() => router.push('/(admin)/billing')}>
          <Text style={styles.tileLabel}>Finance Queue</Text>
          <Text style={styles.tileSub}>Verify pending invoice payments</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operations</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(admin)/doctors')}>
          <Text style={styles.primaryButtonText}>Manage Doctor Directory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(admin)/pharmacy')}>
          <Text style={styles.secondaryButtonText}>Review Inventory Actions</Text>
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
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#0f766e', fontWeight: '700' },
});
