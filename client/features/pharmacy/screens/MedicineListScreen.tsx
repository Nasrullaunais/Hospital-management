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
  Image,
} from 'react-native';
import { medicineService } from '../services/medicine.service';
import type { Medicine } from '@/shared/types';

/**
 * MedicineListScreen — Member 5
 * Browsable pharmacy catalog with filtering by category.
 * TODO: Replace text input filter with a category chip/picker.
 * TODO: Navigate to MedicineDetailScreen on card press.
 * TODO: Admin: add "Add Medicine" FAB button.
 * TODO: Show low-stock warning when stockQuantity < 10.
 */
export default function MedicineListScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchMedicines = useCallback(async () => {
    try {
      setError(null);
      const data = await medicineService.getMedicines(
        categoryFilter ? { category: categoryFilter } : undefined,
      );
      setMedicines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicines.');
    }
  }, [categoryFilter]);

  useEffect(() => {
    setLoading(true);
    fetchMedicines().finally(() => setLoading(false));
  }, [fetchMedicines]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  };

  const isExpiringSoon = (dateStr: string) => {
    const daysUntilExpiry =
      (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 30;
  };

  const renderMedicine = ({ item }: { item: Medicine }) => (
    <TouchableOpacity style={styles.card}>
      {item.packagingImageUrl ? (
        <Image source={{ uri: item.packagingImageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>💊</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <Text
            style={[styles.stock, item.stockQuantity < 10 ? styles.stockLow : undefined]}
          >
            {item.stockQuantity < 10 ? '⚠️ ' : ''}Stock: {item.stockQuantity}
          </Text>
        </View>
        {isExpiringSoon(item.expiryDate) && (
          <Text style={styles.expiry}>⏳ Expires {new Date(item.expiryDate).toLocaleDateString()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Filter by category..."
        value={categoryFilter}
        onChangeText={setCategoryFilter}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchMedicines}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item._id}
          renderItem={renderMedicine}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No medicines found. Try a different category.
            </Text>
          }
          contentContainerStyle={medicines.length === 0 ? styles.emptyContainer : undefined}
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  image: { width: 80, height: 80 },
  imagePlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 28 },
  cardBody: { flex: 1, padding: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  category: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12 },
  price: { fontSize: 14, fontWeight: '600', color: '#059669' },
  stock: { fontSize: 13, color: '#555' },
  stockLow: { color: '#d97706' },
  expiry: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 60 },
});
