import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export default function PharmacistDashboard() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pharmacist Dashboard</Text>
      <Text style={styles.subtitle}>Monitor stock health and update inventory records.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventory Workflow</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(pharmacist)/pharmacy')}>
          <Text style={styles.primaryButtonText}>View Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}>
          <Text style={styles.secondaryButtonText}>Add Medication</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteTitle}>Focus Areas</Text>
        <Text style={styles.noteText}>Keep packaging images clear and track low-stock alerts daily.</Text>
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
  noteBox: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  noteTitle: { color: '#155e75', fontSize: 14, fontWeight: '700' },
  noteText: { color: '#0e7490', fontSize: 13 },
});
