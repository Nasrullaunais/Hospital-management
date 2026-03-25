import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  RefreshControl,
} from 'react-native';
import { doctorService, type DoctorFilters } from '../services/doctor.service';
import type { Doctor } from '@/shared/types';

/**
 * DoctorListScreen — Member 2
 * Displays a filterable, paginated list of doctors.
 * TODO: Add navigation to DoctorDetailScreen on card press.
 * TODO: Add pagination / infinite scroll (update backend controller too).
 * TODO: Replace simple dropdown with a proper picker component.
 */
export default function DoctorListScreen() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DoctorFilters>({});
  const [search, setSearch] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      setError(null);
      const data = await doctorService.getDoctors(
        search ? { ...filters, specialization: search } : filters,
      );
      setDoctors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors.');
    }
  }, [filters, search]);

  useEffect(() => {
    setLoading(true);
    fetchDoctors().finally(() => setLoading(false));
  }, [fetchDoctors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDoctors();
    setRefreshing(false);
  };

  const renderDoctor = ({ item }: { item: Doctor }) => (
    <TouchableOpacity style={styles.card}>
      <Text style={styles.doctorName}>
        {typeof item.userId === 'object' ? item.userId.name : 'Dr. Unknown'}
      </Text>
      <Text style={styles.specialization}>{item.specialization}</Text>
      <View style={styles.row}>
        <Text style={styles.detail}>⏱ {item.experienceYears} yrs exp</Text>
        <Text style={styles.detail}>💵 ${item.consultationFee}</Text>
        <Text
          style={[
            styles.badge,
            item.availability === 'Available' ? styles.badgeGreen : styles.badgeGray,
          ]}
        >
          {item.availability}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by specialization..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDoctors}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={doctors}
          keyExtractor={(item) => item._id}
          renderItem={renderDoctor}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No doctors found. Try a different search.</Text>
          }
          contentContainerStyle={doctors.length === 0 ? styles.emptyContainer : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchInput: {
    margin: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  doctorName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  specialization: { fontSize: 14, color: '#2563eb', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  detail: { fontSize: 13, color: '#555' },
  badge: { fontSize: 11, fontWeight: '600', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeGray: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 60 },
});
