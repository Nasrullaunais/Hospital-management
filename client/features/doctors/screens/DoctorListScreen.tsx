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
import { doctorService, type DoctorFilters } from '../services/doctor.service';
import type { Doctor } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { SkeletonCard } from '@/components/ui/Skeleton';

const TAB_BAR_HEIGHT = 70;

export default function DoctorListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DoctorFilters>({});
  const [search, setSearch] = useState('');

  const fetchDoctors = useCallback(async () => {
    try {
      setError(null);
      const data = await doctorService.getDoctors(filters);
      setDoctors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors.');
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchDoctors().finally(() => setLoading(false));
  }, [fetchDoctors]);

  const filteredDoctors = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.toLowerCase();
    return doctors.filter((d) => {
      const name = typeof d.userId === 'object' ? d.userId.name?.toLowerCase() ?? '' : '';
      const specialization = d.specialization?.toLowerCase() ?? '';
      return name.includes(q) || specialization.includes(q);
    });
  }, [doctors, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDoctors();
    setRefreshing(false);
  }, [fetchDoctors]);

  const doctorDetailPath = user?.role === 'admin' ? '/(admin)/doctors/[id]' : '/(patient)/doctors/[id]';

  const renderDoctor = useCallback(({ item }: { item: Doctor }) => {
    const doctorName = item.userId && typeof item.userId === 'object' ? item.userId.name : 'Dr. Unknown';
    const isAvailable = item.availability === 'Available';

    const initials = doctorName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: doctorDetailPath, params: { id: item._id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.basicInfo}>
            <Text style={[styles.doctorName, { color: theme.text }]}>{doctorName}</Text>
            <View style={[styles.specializationBadge, { backgroundColor: theme.primaryMuted }]}>
              <Text style={[styles.specializationText, { color: theme.primary }]}>{item.specialization}</Text>
            </View>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: isAvailable ? theme.successBg : theme.surfaceTertiary },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: isAvailable ? theme.success : theme.textSecondary },
              ]}
            >
              {item.availability}
            </Text>
          </View>
        </View>

        <View style={[styles.metaRow, { borderTopColor: theme.divider }]}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={14} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.experienceYears} yrs exp</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="dollar-sign" size={14} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>${item.consultationFee}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [theme, router, doctorDetailPath]);

  const keyExtractor = useCallback((item: Doctor) => item._id, []);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="users" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No doctors found.</Text>
      <Text style={[styles.emptySubText, { color: theme.textTertiary }]}>Try a different search.</Text>
    </View>
  ), [theme]);

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/(admin)/doctors/add')}
          >
            <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.addButtonText}>Add Doctor</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search doctors..."
            placeholderTextColor={theme.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.skeletonList}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      {user?.role === 'admin' && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/(admin)/doctors/add')}
        >
          <Feather name="plus" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
          <Text style={styles.addButtonText}>Add Doctor</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="search" size={18} color={theme.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search doctors..."
          placeholderTextColor={theme.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredDoctors}
        keyExtractor={keyExtractor}
        renderItem={renderDoctor}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={filteredDoctors.length === 0 ? styles.emptyList : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: typography.sm },
  listContent: { padding: spacing.md, paddingTop: spacing.xs },
  emptyList: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: typography.md, fontWeight: typography.semibold },
  emptySubText: { fontSize: typography.sm },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: typography.md, fontWeight: typography.bold },
  basicInfo: { flex: 1 },
  doctorName: { fontSize: typography.md, fontWeight: typography.semibold, marginBottom: 4 },
  specializationBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  specializationText: { fontSize: 12, fontWeight: typography.medium },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: 11, fontWeight: typography.semibold },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 13 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    height: 56,
    ...shadows.button,
  },
  addButtonText: { color: '#fff', fontSize: typography.sm, fontWeight: typography.semibold },
  errorText: { fontSize: typography.sm, marginBottom: spacing.sm },
  retryText: { fontWeight: typography.semibold, fontSize: typography.sm },
  skeletonList: { padding: spacing.md, paddingTop: spacing.xs },
});