import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLES } from '@/shared/constants/roles';
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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD } from '@/shared/constants/Config';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import type { Medicine } from '@/shared/types';
import { medicineService } from '@/features/pharmacy/services/medicine.service';

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].surfaceTertiary,
  },
  list: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    backgroundColor: Colors[colorScheme].surface,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: 86,
    height: 86,
    backgroundColor: Colors[colorScheme].border,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  cardBody: {
    flex: 1,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.xs,
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: Colors[colorScheme].text,
    flex: 1,
    paddingRight: spacing.sm,
  },
  meta: {
    fontSize: typography.xs,
    color: Colors[colorScheme].textSecondary,
  },
  stockText: {
    fontSize: 13,
    fontWeight: typography.semibold,
    color: Colors[colorScheme].text,
  },
  stockTextLow: {
    color: Colors[colorScheme].error,
  },
  lowStockBadge: {
    backgroundColor: Colors[colorScheme].errorBg,
    borderColor: Colors[colorScheme].error,
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  lowStockBadgeText: {
    color: Colors[colorScheme].error,
    fontSize: 11,
    fontWeight: typography.bold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: Colors[colorScheme].accent,
    borderRadius: radius.md,
    height: 52,
    ...shadows.button,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors[colorScheme].surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: Colors[colorScheme].primary,
  },
  retryButtonText: {
    fontWeight: typography.semibold,
  },
  emptyText: {
    color: Colors[colorScheme].textTertiary,
    fontSize: typography.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].primary,
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: Colors[colorScheme].error,
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: typography.xs,
    fontWeight: typography.bold,
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
    () => user?.role === ROLES.ADMIN || user?.role === ROLES.PHARMACIST,
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
    const lowStock = item.stockQuantity < LOW_STOCK_THRESHOLD;

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
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.addButtonText}>Add Medication</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={medicines}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors[colorScheme].primary} />}
        contentContainerStyle={medicines.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No medicines in inventory.</Text>}
      />
    </SafeAreaView>
  );
}
