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
import { departmentService } from '../services/department.service';
import type { Department } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

export default function DepartmentListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchDepartments = useCallback(async () => {
    try {
      setError(null);
      const data = await departmentService.getDepartments();
      setDepartments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDepartments().finally(() => setLoading(false));
  }, [fetchDepartments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDepartments();
    setRefreshing(false);
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(search.toLowerCase()),
  );

  const departmentDetailPath = user?.role === 'admin' ? '/(admin)/departments/[id]' : '/(patient)/departments/[id]';

  const renderDepartment = ({ item }: { item: Department }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: departmentDetailPath, params: { id: item._id } })}
    >
      <View style={styles.header}>
        <Text style={styles.departmentName}>{item.name}</Text>
        <View style={[styles.badge, item.status === 'active' ? styles.badgeGreen : styles.badgeGray]}>
          <Text style={[styles.badgeText, item.status === 'active' ? styles.badgeTextGreen : styles.badgeTextGray]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      <View style={styles.row}>
        <Text style={styles.detail}>📍 {item.location}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.detail}>📞 {item.phone}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {user?.role === 'admin' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(admin)/departments/add')}
        >
          <Text style={styles.addButtonText}>+ Add Department</Text>
        </TouchableOpacity>
      )}
      <TextInput
        style={styles.searchInput}
        placeholder="Search departments..."
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDepartments}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDepartments}
          keyExtractor={(item) => item._id}
          renderItem={renderDepartment}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No departments found.</Text>
          }
          contentContainerStyle={filteredDepartments.length === 0 ? styles.emptyContainer : undefined}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  departmentName: { fontSize: 17, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  description: { fontSize: 14, color: '#666', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detail: { fontSize: 13, color: '#555' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen: { backgroundColor: '#dcfed6' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextGreen: { color: '#166534' },
  badgeTextGray: { color: '#6b7280' },
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
