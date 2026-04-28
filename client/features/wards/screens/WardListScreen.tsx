import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { wardService, type WardFilters } from '../services/ward.service';
import type { Ward } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function WardListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WardFilters>({});
  const [search, setSearch] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWards();
    setRefreshing(false);
  }, [fetchWards]);

  const filteredWards = useMemo(() =>
    wards.filter((ward) => ward.name.toLowerCase().includes(search.toLowerCase())),
    [wards, search]
  );

  const wardDetailPath = user?.role === 'admin' ? '/(admin)/wards/[id]' : '/(patient)/wards/[id]';

  const getStatusStyle = useCallback((status: string) => {
    switch (status) {
      case 'available':
        return { bg: theme.successBg, border: theme.success, text: theme.success };
      case 'full':
        return { bg: theme.errorBg, border: theme.error, text: theme.error };
      case 'maintenance':
        return { bg: theme.warningBg, border: theme.warning, text: theme.warning };
      default:
        return { bg: theme.surfaceTertiary, border: theme.border, text: theme.textSecondary };
    }
  }, [theme]);

  const renderWard = useCallback(({ item }: { item: Ward }) => {
    const departmentName = typeof item.departmentId === 'object' ? item.departmentId.name : 'Unknown';
    const occupancyPercent = Math.round((item.currentOccupancy / item.totalBeds) * 100);
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: wardDetailPath, params: { id: item._id } })}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={[styles.wardName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.departmentName, { color: theme.textSecondary }]}>{departmentName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.typeContainer}>
          <Text style={[styles.typeLabel, { color: theme.textTertiary }]}>Type: </Text>
          <Text style={[styles.typeValue, { color: theme.primary }]}>{item.type.toUpperCase()}</Text>
        </View>

        <View style={styles.bedsContainer}>
          <View style={styles.bedsInfo}>
            <Text style={[styles.bedsLabel, { color: theme.textTertiary }]}>Beds</Text>
            <Text style={[styles.bedsValue, { color: theme.text }]}>{item.currentOccupancy} / {item.totalBeds}</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.surfaceTertiary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${occupancyPercent}%`,
                  backgroundColor: occupancyPercent >= 100 ? theme.error : theme.success
                }
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, router, wardDetailPath, getStatusStyle]);

  const keyExtractor = useCallback((item: Ward) => item._id, []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="home" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No wards found.</Text>
    </View>
  ), [theme]);

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={fetchWards}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      {user?.role === 'admin' && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/(admin)/wards/add')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.addButtonText}>Add Ward</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search wards..."
          placeholderTextColor={theme.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredWards}
        keyExtractor={keyExtractor}
        renderItem={renderWard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={filteredWards.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: typography.md, marginTop: spacing.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sm,
  },
  card: {
    marginBottom: 12,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerInfo: { flex: 1 },
  wardName: { fontSize: typography.md, fontWeight: typography.semibold },
  departmentName: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: typography.semibold },
  typeContainer: { flexDirection: 'row', marginBottom: spacing.sm },
  typeLabel: { fontSize: 13 },
  typeValue: { fontSize: 13, fontWeight: typography.semibold },
  bedsContainer: { marginTop: spacing.xs },
  bedsInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  bedsLabel: { fontSize: typography.xs },
  bedsValue: { fontSize: typography.xs, fontWeight: typography.semibold },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    height: 52,
    ...shadows.button,
  },
  addButtonText: { color: '#fff', fontSize: typography.sm, fontWeight: typography.semibold },
  errorText: { fontSize: typography.sm, marginTop: spacing.md },
  retryText: { fontWeight: typography.semibold, fontSize: typography.sm, marginTop: spacing.sm },
});