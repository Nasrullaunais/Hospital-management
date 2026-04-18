import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { Config } from '@/shared/constants/Config';
import type { Medicine } from '@/shared/types';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors, { gray } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

// Hook to get merged colors object with gray scale
const useColors = (colorScheme: 'light' | 'dark' | null) => useMemo(() => {
  const c = Colors[colorScheme ?? 'light'];
  return {
    // From theme
    surface: c.surface,
    primary: c.primary,
    success: c.success,
    successBg: c.successBg,
    error: c.error,
    errorBg: c.errorBg,
    // Gray scale (always use light theme for static styles)
    gray50: gray[50],
    gray100: gray[100],
    gray200: gray[200],
    gray300: gray[300],
    gray400: gray[400],
    gray500: gray[500],
    gray600: gray[600],
    gray700: gray[700],
    gray800: gray[800],
    gray900: gray[900],
    // Text colors from theme
    text: c.text,
    textMuted: c.textSecondary,
  };
}, [colorScheme]);

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
  const colorScheme = useColorScheme();
  const c = useColors(colorScheme);

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const canAddMedicine = useMemo(
    () => user?.role === 'admin' || user?.role === 'pharmacist',
    [user?.role],
  );

  const fetchMedicines = useCallback(async () => {
    try {
      setError(null);
      const params = categoryFilter ? { category: categoryFilter } : undefined;
      const data = await medicineService.getMedicines(params);
      setMedicines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicine inventory.');
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
    const daysUntil = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 60;
  };

  const isLowStock = (qty: number) => qty < 10;

  const renderItem = ({ item }: { item: Medicine }) => {
    const lowStock = isLowStock(item.stockQuantity);
    const expiringSoon = isExpiringSoon(item.expiryDate);

    return (
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <Image
          source={{ uri: getImageUrl(item.packagingImageUrl) }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.stockBadge, lowStock ? styles.stockBadgeLow : expiringSoon ? styles.stockBadgeExpiry : styles.stockBadgeOk]}>
              <Text style={[styles.stockBadgeText, lowStock ? styles.stockBadgeTextLow : expiringSoon ? styles.stockBadgeTextExpiry : styles.stockBadgeTextOk]}>
                {lowStock ? 'Low Stock' : expiringSoon ? 'Expiring' : 'In Stock'}
              </Text>
            </View>
          </View>

          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              Expiry: {new Date(item.expiryDate).toLocaleDateString()}
            </Text>
            {expiringSoon && !lowStock && (
              <View style={[styles.expiryPill, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                <Text style={[styles.expiryPillText, { color: '#b45309' }]}>Expires Soon</Text>
              </View>
            )}
          </View>

          <View style={styles.stockRow}>
            <Text style={[styles.stockText, lowStock ? styles.stockTextLow : undefined]}>
              Stock: {item.stockQuantity}
            </Text>
            {lowStock && (
              <Text style={styles.stockWarning}>Reorder required</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
        <TouchableOpacity onPress={fetchMedicines} style={[styles.retryButton, { backgroundColor: c.primary }]}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.gray50 }]}>
      <View style={[styles.filterRow, { backgroundColor: c.surface }]}>
        <TextInput
          style={[styles.filterInput, { backgroundColor: c.gray100, borderColor: c.gray200, color: c.text }]}
          placeholder="Filter by category..."
          placeholderTextColor={c.textMuted}
          value={categoryFilter}
          onChangeText={setCategoryFilter}
        />
      </View>

      {canAddMedicine ? (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: c.primary }]}
          onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}
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
        ListEmptyComponent={<Text style={[styles.emptyText, { color: c.textMuted }]}>No medicines in inventory.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: { padding: 12, paddingTop: 8 },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: { width: 86, height: 86, backgroundColor: gray[200] },
  cardBody: { flex: 1, padding: 10, gap: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '700', color: gray[900], flex: 1, paddingRight: 8 },
  category: { fontSize: 12, color: gray[500], marginBottom: 2 },
  price: { fontSize: 14, fontWeight: '600', color: Colors.light.success },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  meta: { fontSize: 12, color: gray[500] },
  expiryPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  expiryPillText: { fontSize: 10, fontWeight: '700' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  stockText: { fontSize: 13, fontWeight: '700', color: gray[800] },
  stockTextLow: { color: Colors.light.error },
  stockWarning: { fontSize: 11, color: Colors.light.error, fontWeight: '500' },
  stockBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  stockBadgeLow: { backgroundColor: Colors.light.errorBg, borderColor: Colors.light.error },
  stockBadgeExpiry: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  stockBadgeOk: { backgroundColor: Colors.light.successBg, borderColor: Colors.light.success },
  stockBadgeText: { fontSize: 11, fontWeight: '700' },
  stockBadgeTextLow: { color: Colors.light.error },
  stockBadgeTextExpiry: { color: '#b45309' },
  stockBadgeTextOk: { color: Colors.light.success },
  addButton: { marginHorizontal: 12, marginTop: 8, marginBottom: 6, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { marginBottom: 12, textAlign: 'center' },
  retryButton: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  retryButtonText: { color: '#ffffff', fontWeight: '600' },
  emptyText: { fontSize: 14 },
});