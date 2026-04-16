import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { dispensingService } from '../services/dispensing.service';

export default function PendingPrescriptionsScreen() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadPending = useCallback(async () => {
    try {
      setError(null);
      const data = await dispensingService.getPendingPrescriptions();
      setPending(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  const onRefresh = () => { setRefreshing(true); loadPending(); };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Pending Prescriptions</Text>
        <Text style={styles.count}>{pending.length} waiting</Text>
      </View>
      <FlatList
        data={pending}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const patientName = typeof item.patientId === 'object' ? item.patientId?.name : 'Patient';
          const doctorName = typeof item.doctorId === 'object' ? item.doctorId?.userId?.name : 'Doctor';
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/dispense/${item._id}`)}>
              <View style={styles.cardTop}>
                <Text style={styles.patientName}>{patientName}</Text>
                <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>PENDING</Text></View>
              </View>
              <Text style={styles.doctor}>Dr. {doctorName}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.medicineCount}>{item.items.length} medicine(s)</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.empty}>No pending prescriptions</Text><Text style={styles.emptySub}>All caught up!</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  count: { fontSize: 14, color: '#888', backgroundColor: '#f5f5f5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 16, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patientName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  pendingBadge: { backgroundColor: '#fff3e0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#e65100', letterSpacing: 0.5 },
  doctor: { fontSize: 14, color: '#666', marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 13, color: '#999' },
  medicineCount: { fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 18, color: '#999', fontWeight: '600' },
  emptySub: { fontSize: 14, color: '#bbb', marginTop: 8 },
  error: { color: '#e53935', fontSize: 15 },
});
