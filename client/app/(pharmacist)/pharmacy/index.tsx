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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { Config } from '@/shared/constants/Config';
import type { Medicine } from '@/shared/types';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

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
  const theme = Colors[colorScheme ?? 'light'];

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canAddMedicine = useMemo(
    () => user?.role === 'admin' || user?.role === 'pharmacist',
    [user?.role],
  );

  const filteredMedicines = useMemo(() => {
    if (!searchQuery.trim()) return medicines;
    const q = searchQuery.toLowerCase();
    return medicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
    );
  }, [medicines, searchQuery]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMedicines();
    setRefreshing(false);
  }, [fetchMedicines]);

  const isExpiringSoon = useCallback((dateStr: string) => {
    const daysUntil = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 60;
  }, []);

  const isLowStock = useCallback((qty: number) => qty < 10, []);

  const getBadgeStyle = useCallback((lowStock: boolean, expiringSoon: boolean) => {
    if (lowStock) return { bg: theme.errorBg, border: theme.error, text: theme.error };
    if (expiringSoon) return { bg: theme.warningBg, border: theme.warning, text: theme.warning };
    return { bg: theme.successBg, border: theme.success, text: theme.success };
  }, [theme]);

  const renderItem = useCallback(({ item }: { item: Medicine }) => {
    const lowStock = isLowStock(item.stockQuantity);
    const expiringSoon = isExpiringSoon(item.expiryDate);
    const badgeStyle = getBadgeStyle(lowStock, expiringSoon);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/(pharmacist)/pharmacy/${item._id}`)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: getImageUrl(item.packagingImageUrl) }}
          style={styles.image}
          resizeMode="cover"
        />
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
          <Text style={[styles.price, { color: theme.success }]}>${item.price.toFixed(2)}</Text>

          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              Expiry: {new Date(item.expiryDate).toLocaleDateString()}
            </Text>
            {expiringSoon && !lowStock && (
              <View style={[styles.expiryPill, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
                <Text style={[styles.expiryPillText, { color: theme.warning }]}>Expires Soon</Text>
              </View>
            )}
          </View>

          <View style={styles.stockRow}>
            <Text style={[styles.stockText, lowStock ? { color: theme.error } : { color: theme.textSecondary }]}>
              Stock: {item.stockQuantity}
            </Text>
            {lowStock && (
              <Text style={[styles.stockWarning, { color: theme.error }]}>Reorder required</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, isLowStock, isExpiringSoon, getBadgeStyle, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.center, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.center, { backgroundColor: theme.background }]}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={fetchMedicines} style={[styles.retryButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'top']}>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
          <Feather name="search" size={16} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search medicines..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterChip, { borderColor: theme.border }]}
          onPress={() => setCategoryFilter(categoryFilter ? '' : 'Antibiotic')}
        >
          <Feather name="filter" size={14} color={categoryFilter ? theme.primary : theme.textTertiary} />
          <Text style={[styles.filterChipText, { color: categoryFilter ? theme.primary : theme.textTertiary }]}>
            {categoryFilter || 'Category'}
          </Text>
        </TouchableOpacity>
      </View>

      {canAddMedicine ? (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}
        >
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
          <Text style={styles.addButtonText}>Add Medication</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={filteredMedicines}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={filteredMedicines.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No medicines found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, height: 42 },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: 15 },
  filterChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, height: 42, gap: spacing.xs },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: spacing.sm },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.card,
  },
  image: { width: 86, height: 86 },
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  name: { fontSize: 15, fontWeight: '700', flex: 1, paddingRight: spacing.sm },
  category: { fontSize: 12 },
  price: { fontSize: 14, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  meta: { fontSize: 12 },
  expiryPill: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  expiryPillText: { fontSize: 10, fontWeight: '700' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  stockText: { fontSize: 13, fontWeight: '700' },
  stockWarning: { fontSize: 11, fontWeight: '500' },
  stockBadge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  stockBadgeText: { fontSize: 11, fontWeight: '700' },
  addButton: { marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs, borderRadius: radius.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 15, marginTop: spacing.md, textAlign: 'center' },
  retryButton: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  retryButtonText: { color: '#ffffff', fontWeight: '600' },
});