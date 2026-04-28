import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import type { Medicine } from '@/shared/types';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS } from '@/shared/constants/pharmacy';
import { getImageUrl } from '@/shared/utils/getImageUrl';

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
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
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

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach((m) => { if (m.category) cats.add(m.category); });
    return Array.from(cats).sort();
  }, [medicines]);

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
    const daysUntil = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= EXPIRY_WARNING_DAYS;
  }, []);

  const isLowStock = useCallback((qty: number) => qty < LOW_STOCK_THRESHOLD, []);

  const handleDeleteMedicine = useCallback((medicine: Medicine) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicine.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Delete functionality is available in the medicine detail view.');
          },
        },
      ],
    );
  }, []);

  const renderItem = useCallback(({ item }: { item: Medicine }) => {
    const lowStock = isLowStock(item.stockQuantity);
    const expiringSoon = isExpiringSoon(item.expiryDate);

    const badgeBg = lowStock ? theme.errorBg : theme.surfaceTertiary;
    const badgeBorder = lowStock ? theme.error : theme.border;
    const badgeText = lowStock ? theme.error : theme.textSecondary;
    const badgeLabel = lowStock ? 'Low Stock' : 'In Stock';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, ...shadows.card }]}
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
            <View style={[styles.stockBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
              <Text style={[styles.stockBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
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

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.push(`/(pharmacist)/pharmacy/${item._id}`)}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={14} color="#FFFFFF" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: theme.error }]}
              onPress={() => handleDeleteMedicine(item)}
              activeOpacity={0.7}
            >
              <Feather name="trash-2" size={14} color="#FFFFFF" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, isLowStock, isExpiringSoon, router, handleDeleteMedicine]);

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
          onPress={() => {
            if (availableCategories.length === 0) return;
            if (!categoryFilter && availableCategories.length > 0) {
              setCategoryFilter(availableCategories[0]);
            } else {
              const idx = availableCategories.indexOf(categoryFilter);
              if (idx >= 0 && idx < availableCategories.length - 1) {
                setCategoryFilter(availableCategories[idx + 1]);
              } else {
                setCategoryFilter('');
              }
            }
          }}
        >
          <Feather name="filter" size={14} color={categoryFilter ? theme.primary : theme.textTertiary} />
          <Text style={[styles.filterChipText, { color: categoryFilter ? theme.primary : theme.textTertiary }]}>
            {categoryFilter || 'Category'}
          </Text>
        </TouchableOpacity>
      </View>

      {canAddMedicine ? (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}
        >
          <Feather name="plus" size={20} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
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
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
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
  list: { padding: spacing.md, gap: spacing.sm },
  emptyList: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: typography.md, fontWeight: '600', marginTop: spacing.sm },
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: { width: 86, height: 86, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    flex: 1,
  },
  editBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    flex: 1,
  },
  deleteBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  addButton: { marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs, borderRadius: radius.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 15, marginTop: spacing.md, textAlign: 'center' },
  retryButton: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
});
