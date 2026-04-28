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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { departmentService } from '../services/department.service';
import type { Department } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DepartmentListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDepartments();
    setRefreshing(false);
  }, [fetchDepartments]);

  const filteredDepartments = useMemo(() =>
    departments.filter((dept) => dept.name.toLowerCase().includes(search.toLowerCase())),
    [departments, search]
  );

  const departmentDetailPath = user?.role === 'admin' ? '/(admin)/departments/[id]' : '/(patient)/departments/[id]';

  const getStatusStyle = useCallback((status: string) => {
    if (status === 'active') {
      return { bg: theme.successBg, text: theme.success };
    }
    return { bg: theme.surfaceTertiary, text: theme.textSecondary };
  }, [theme]);

  const renderDepartment = useCallback(({ item }: { item: Department }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: departmentDetailPath, params: { id: item._id } })}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={[styles.departmentName, { color: theme.text }]}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.row}>
          <Feather name="map-pin" size={13} color={theme.textTertiary} style={{ marginRight: spacing.xs }} />
          <Text style={[styles.detail, { color: theme.textSecondary }]}>{item.location}</Text>
        </View>
        <View style={styles.row}>
          <Feather name="phone" size={13} color={theme.textTertiary} style={{ marginRight: spacing.xs }} />
          <Text style={[styles.detail, { color: theme.textSecondary }]}>{item.phone}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [theme, router, departmentDetailPath, getStatusStyle]);

  const keyExtractor = useCallback((item: Department) => item._id, []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="grid" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No departments found.</Text>
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
          <TouchableOpacity onPress={fetchDepartments}>
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
          onPress={() => router.push('/(admin)/departments/add')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.addButtonText}>Add Department</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search departments..."
          placeholderTextColor={theme.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredDepartments}
        keyExtractor={keyExtractor}
        renderItem={renderDepartment}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={filteredDepartments.length === 0 ? styles.emptyList : styles.list}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  departmentName: { fontSize: typography.md, fontWeight: typography.semibold, flex: 1 },
  description: { fontSize: 13, marginBottom: spacing.sm, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  detail: { fontSize: 13 },
  badge: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: 11, fontWeight: typography.semibold },
  emptyText: { fontSize: typography.md, marginTop: spacing.md },
  errorText: { fontSize: typography.sm, marginTop: spacing.md },
  retryText: { fontWeight: typography.semibold, fontSize: typography.sm, marginTop: spacing.sm },
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
});
