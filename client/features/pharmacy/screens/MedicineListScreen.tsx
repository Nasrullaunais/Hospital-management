import React, { useCallback, useState, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { Feather } from '@expo/vector-icons';
import { medicineService } from '../services/medicine.service';
import type { Medicine } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS } from '@/shared/constants/pharmacy';
import { getImageUrl } from '@/shared/utils/getImageUrl';

export default function MedicineListScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMedicines().finally(() => setLoading(false));
    }, [fetchMedicines]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  }, [fetchMedicines]);

  const isExpiringSoon = useCallback((dateStr: string) => {
    const daysUntilExpiry = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= EXPIRY_WARNING_DAYS;
  }, []);

  const isLowStock = useCallback((qty: number) => qty < LOW_STOCK_THRESHOLD, []);

  const getStockBadgeStyle = useCallback((item: Medicine) => {
    const lowStock = isLowStock(item.stockQuantity);
    const expiringSoon = isExpiringSoon(item.expiryDate);

    if (lowStock) return { bg: theme.errorBg, border: theme.error, text: theme.error };
    if (expiringSoon) return { bg: theme.warningBg, border: theme.warning, text: theme.warning };
    return { bg: theme.successBg, border: theme.success, text: theme.success };
  }, [theme, isLowStock, isExpiringSoon]);

  const renderMedicine = useCallback(({ item }: { item: Medicine }) => {
    const lowStock = isLowStock(item.stockQuantity);
    const expiringSoon = isExpiringSoon(item.expiryDate);
    const badgeStyle = getStockBadgeStyle(item);

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {item.packagingImageUrl ? (
          <Image source={{ uri: getImageUrl(item.packagingImageUrl) }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: theme.surfaceTertiary }]}>
            <Text style={[styles.imagePlaceholderText, { color: theme.textTertiary }]}>Pill</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.rowBetween}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.stockBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
              <Text style={[styles.stockBadgeText, { color: badgeStyle.text }]}>
                {lowStock ? 'Low Stock' : expiringSoon ? 'Expiring' : 'In Stock'}
              </Text>
            </View>
          </View>

          <Text style={[styles.category, { color: theme.textSecondary }]}>{item.category}</Text>

          <View style={styles.row}>
            <Text style={[styles.price, { color: theme.success }]}>${item.price.toFixed(2)}</Text>
            <Text style={[styles.stock, { color: lowStock ? theme.error : theme.textSecondary }]}>
              Stock: {item.stockQuantity}
            </Text>
          </View>

          {expiringSoon && (
            <View style={[styles.expiryRow, { marginTop: spacing.xs }]}>
              <View style={[styles.expiryPill, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
                <Text style={[styles.expiryPillText, { color: theme.warning }]}>
                  Expires {new Date(item.expiryDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }, [theme, isLowStock, isExpiringSoon, getStockBadgeStyle]);

  const keyExtractor = useCallback((item: Medicine) => item._id, []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="package" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No medicines found.</Text>
      <Text style={[styles.emptySub, { color: theme.textTertiary }]}>Try a different category.</Text>
    </View>
  ), [theme]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity onPress={fetchMedicines}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.filterRow, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.text }]}
          placeholder="Filter by category..."
          placeholderTextColor={theme.inputPlaceholder}
          value={categoryFilter}
          onChangeText={setCategoryFilter}
        />
      </View>

      <FlatList
        data={medicines}
        keyExtractor={keyExtractor}
        renderItem={renderMedicine}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={medicines.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: spacing.md },
  emptySub: { fontSize: 14, marginTop: spacing.xs },
  card: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.card,
  },
  image: { width: 80, height: 80 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 12, fontWeight: '600' },
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', flex: 1, paddingRight: spacing.sm },
  category: { fontSize: 12 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  price: { fontSize: 14, fontWeight: '600' },
  stock: { fontSize: 13 },
  stockBadge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  stockBadgeText: { fontSize: 11, fontWeight: '700' },
  expiryRow: { flexDirection: 'row' },
  expiryPill: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  expiryPillText: { fontSize: 11, fontWeight: '600' },
  errorText: { fontSize: 15, marginTop: spacing.md },
  retryText: { fontWeight: '600', fontSize: 15, marginTop: spacing.sm },
});