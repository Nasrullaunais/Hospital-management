import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
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

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].surfaceTertiary,
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
    backgroundColor: Colors[colorScheme].surface,
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
    backgroundColor: Colors[colorScheme].border,
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
    color: Colors[colorScheme].text,
    flex: 1,
    paddingRight: 8,
  },
  meta: {
    fontSize: 12,
    color: Colors[colorScheme].textSecondary,
  },
  stockText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: Colors[colorScheme].text,
  },
  stockTextLow: {
    color: Colors[colorScheme].error,
  },
  lowStockBadge: {
    backgroundColor: Colors[colorScheme].errorBg,
    borderColor: Colors[colorScheme].error,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lowStockBadgeText: {
    color: Colors[colorScheme].error,
    fontSize: 11,
    fontWeight: '700',
  },
  addButton: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 5,
    backgroundColor: Colors[colorScheme].primary,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors[colorScheme].surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors[colorScheme].primary,
  },
  retryButtonText: {
    fontWeight: '600',
  },
  emptyText: {
    color: Colors[colorScheme].textTertiary,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].primary,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].error,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default function PharmacyInventoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMedicines().finally(() => setLoading(false));
    }, [fetchMedicines]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  };

  const handleEditMedicine = (medicine: Medicine) => {
    router.push(`/(admin)/pharmacy/edit-medicine?id=${medicine._id}`);
  };

  const handleDeleteMedicine = (medicine: Medicine) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete "${medicine.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicineService.deleteMedicine(medicine._id);
              setMedicines((prev) => prev.filter((m) => m._id !== medicine._id));
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete medication.');
            }
          },
        },
      ],
    );
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
          {canAddMedicine ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditMedicine(item)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteMedicine(item)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: Colors[colorScheme].error }]}>{error}</Text>
        <TouchableOpacity onPress={fetchMedicines} style={styles.retryButton}>
          <Text style={[styles.retryButtonText, { color: Colors[colorScheme].primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: Colors[colorScheme].surfaceTertiary }]}>
      {canAddMedicine ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(admin)/pharmacy/add-medicine')}
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
    </SafeAreaView>
  );
}
