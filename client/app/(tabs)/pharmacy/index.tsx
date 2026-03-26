import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { Config } from '@/shared/constants/Config';
import type { Medicine } from '@/shared/types';
import { medicineService } from '@/features/pharmacy/services/medicine.service';

function getImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = Config.BASE_URL.endsWith('/') ? Config.BASE_URL.slice(0, -1) : Config.BASE_URL;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

export default function PharmacyInventoryScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMedicine = useMemo(
    () => user?.role === 'admin' || user?.role === 'pharmacist',
    [user?.role],
  );

  const fetchMedicines = useCallback(async () => {
    try {
      setError(null);
      const data = await medicineService.getMedicines();
      setMedicines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicine inventory.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMedicines().finally(() => setLoading(false));
  }, [fetchMedicines]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Medicine }) => {
    const lowStock = item.stockQuantity < 10;

    return (
      <View style={styles.card}>
        <Image
          source={{ uri: getImageUrl(item.packagingImageUrl) }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{item.name}</Text>
            {lowStock ? (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>Low Stock</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.meta}>Category: {item.category}</Text>
          <Text style={styles.meta}>Price: ${item.price.toFixed(2)}</Text>
          <Text style={styles.meta}>
            Expiry: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
          <Text style={[styles.stockText, lowStock ? styles.stockTextLow : undefined]}>
            Stock: {item.stockQuantity}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1f6feb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchMedicines} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {canAddMedicine ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/pharmacy/add-medicine')}
        >
          <Text style={styles.addButtonText}>Add Medication</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={medicines}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={medicines.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No medicines in inventory.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  list: {
    padding: 12,
    paddingTop: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    width: 86,
    height: 86,
    backgroundColor: '#e5e7eb',
  },
  cardBody: {
    flex: 1,
    padding: 10,
    gap: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    paddingRight: 8,
  },
  meta: {
    fontSize: 12,
    color: '#4b5563',
  },
  stockText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  stockTextLow: {
    color: '#dc2626',
  },
  lowStockBadge: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lowStockBadgeText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },
  addButton: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
