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
import { useRouter } from 'expo-router';
import { wardService, type WardFilters } from '../services/ward.service';
import type { Ward } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

const WARD_TYPES = ['general', 'private', 'icu', 'emergency'] as const;
const WARD_STATUSES = ['available', 'full', 'maintenance'] as const;

export default function WardListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WardFilters>({});
  const [search, setSearch] = useState('');

  const fetchWards = useCallback(async () => {
    try {
      setError(null);
      const data = await wardService.getWards(filters);
      setWards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wards.');
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchWards().finally(() => setLoading(false));
  }, [fetchWards]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWards();
    setRefreshing(false);
  };

  const filteredWards = wards.filter((ward) =>
    ward.name.toLowerCase().includes(search.toLowerCase()),
  );

  const wardDetailPath = user?.role === 'admin' ? '/(admin)/wards/[id]' : '/(patient)/wards/[id]';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return styles.badgeGreen;
      case 'full': return styles.badgeRed;
      case 'maintenance': return styles.badgeYellow;
      default: return styles.badgeGray;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'available': return styles.badgeTextGreen;
      case 'full': return styles.badgeTextRed;
      case 'maintenance': return styles.badgeTextYellow;
      default: return styles.badgeTextGray;
    }
  };

  const renderWard = ({ item }: { item: Ward }) => {
    const departmentName = typeof item.departmentId === 'object' ? item.departmentId.name : 'Unknown';
    const occupancyPercent = Math.round((item.currentOccupancy / item.totalBeds) * 100);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: wardDetailPath, params: { id: item._id } })}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.wardName}>{item.name}</Text>
            <Text style={styles.departmentName}>{departmentName}</Text>
          </View>
          <View style={[styles.badge, getStatusColor(item.status)]}>
            <Text style={[styles.badgeText, getStatusTextColor(item.status)]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.typeContainer}>
          <Text style={styles.typeLabel}>Type: </Text>
          <Text style={styles.typeValue}>{item.type.toUpperCase()}</Text>
        </View>

        <View style={styles.bedsContainer}>
          <View style={styles.bedsInfo}>
            <Text style={styles.bedsLabel}>Beds</Text>
            <Text style={styles.bedsValue}>{item.currentOccupancy} / {item.totalBeds}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${occupancyPercent}%`, backgroundColor: occupancyPercent >= 100 ? '#ef4444' : '#22c55e' }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {user?.role === 'admin' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(admin)/wards/add')}
        >
          <Text style={styles.addButtonText}>+ Add Ward</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Search wards..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchWards}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredWards}
          keyExtractor={(item) => item._id}
          renderItem={renderWard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No wards found.</Text>
          }
          contentContainerStyle={filteredWards.length === 0 ? styles.emptyContainer : undefined}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  wardName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  departmentName: { fontSize: 13, color: '#666', marginTop: 2 },
  typeContainer: { flexDirection: 'row', marginBottom: 10 },
  typeLabel: { fontSize: 13, color: '#888' },
  typeValue: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#dcfed6' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeYellow: { backgroundColor: '#fef3c7' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextGreen: { color: '#166534' },
  badgeTextRed: { color: '#991b1b' },
  badgeTextYellow: { color: '#92400e' },
  badgeTextGray: { color: '#6b7280' },
  bedsContainer: { marginTop: 4 },
  bedsInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  bedsLabel: { fontSize: 12, color: '#888' },
  bedsValue: { fontSize: 12, fontWeight: '600', color: '#1a1a2e' },
  progressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 60 },
  addButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
