import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { prescriptionService, type Prescription } from '../services/prescription.service';
import { useAuth } from '@/shared/context/AuthContext';

export default function PrescriptionListScreen() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  const loadPrescriptions = useCallback(async () => {
    try {
      setError(null);
      if (!user?._id) return;
      const data = await prescriptionService.getMyPrescriptions(user._id);
      setPrescriptions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  const onRefresh = () => { setRefreshing(true); loadPrescriptions(); };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const doctorName = typeof item.doctorId === 'object' ? item.doctorId?.userId?.name : 'Doctor';
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/prescriptions/${item._id}`)}>
              <View style={styles.cardHeader}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <View style={[styles.statusBadge, item.status === 'active' && styles.statusActive, item.status === 'fulfilled' && styles.statusFulfilled, item.status === 'cancelled' && styles.statusCancelled]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.doctor}>Dr. {doctorName}</Text>
              <Text style={styles.items}>{item.items.length} medicine(s) prescribed</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No prescriptions found</Text>}
        contentContainerStyle={prescriptions.length === 0 && styles.emptyContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 13, color: '#666' },
  doctor: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 4 },
  items: { fontSize: 14, color: '#888' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  error: { color: '#e53935', fontSize: 15 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusActive: { backgroundColor: '#e3f2fd' },
  statusFulfilled: { backgroundColor: '#e8f5e9' },
  statusCancelled: { backgroundColor: '#fce4ec' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#555' },
});
