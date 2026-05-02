import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { staffService } from '@/features/staff/services/staff.service';
import type { User } from '@/shared/types';

type StaffRole = 'receptionist' | 'pharmacist';

const ROLES: { key: StaffRole; label: string }[] = [
  { key: 'receptionist', label: 'Receptionists' },
  { key: 'pharmacist', label: 'Pharmacists' },
];

const TAB_BAR_HEIGHT = 70;

export default function StaffListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const params = useLocalSearchParams<{ role?: string }>();
  const preselectedRole = (params.role === 'receptionist' || params.role === 'pharmacist') ? params.role : null;

  const [activeRole, setActiveRole] = useState<StaffRole>(preselectedRole as StaffRole || 'receptionist');
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaff = useCallback(async (role: StaffRole) => {
    try {
      setError(null);
      const data = await staffService.getStaff(role);
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStaff(activeRole).finally(() => setLoading(false));
  }, [activeRole, fetchStaff]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStaff(activeRole);
    setRefreshing(false);
  }, [activeRole, fetchStaff]);

  const handleDelete = useCallback(
    (staffMember: User) => {
      Alert.alert(
        'Delete Staff',
        `Remove ${staffMember.name}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(staffMember._id);
              try {
                await staffService.deleteStaff(staffMember._id);
                setStaff((prev) => prev.filter((s) => s._id !== staffMember._id));
              } catch (err) {
                Alert.alert(
                  'Error',
                  err instanceof Error ? err.message : 'Failed to delete staff.',
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
      );
    },
    [],
  );

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const renderItem = useCallback(
    ({ item }: { item: User }) => {
      const roleLabel = item.role === 'receptionist' ? 'Receptionist' : 'Pharmacist';
      const isDeleting = deletingId === item._id;

      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          activeOpacity={0.7}
          onLongPress={() => handleDelete(item)}
          disabled={isDeleting}
        >
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {getInitials(item.name)}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.cardEmail, { color: theme.textSecondary }]}>
                {item.email}
              </Text>
            </View>
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor:
                    item.role === 'receptionist' ? theme.infoBg : theme.successBg,
                  borderColor:
                    item.role === 'receptionist' ? theme.info : theme.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  {
                    color: item.role === 'receptionist' ? theme.info : theme.success,
                  },
                ]}
              >
                {roleLabel}
              </Text>
            </View>
            {isDeleting && (
              <ActivityIndicator size="small" color={theme.error} style={{ marginLeft: 8 }} />
            )}
          </View>
          {!isDeleting && (
            <TouchableOpacity
              style={styles.deleteTouch}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    },
    [theme, handleDelete, deletingId],
  );

  const keyExtractor = useCallback((item: User) => item._id, []);

  const ListEmptyComponent = (
    <View style={styles.emptyContainer}>
      <Feather
        name={activeRole === 'receptionist' ? 'inbox' : 'package'}
        size={48}
        color={theme.textTertiary}
      />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No {activeRole === 'receptionist' ? 'receptionists' : 'pharmacists'} found.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
          <TouchableOpacity onPress={() => fetchStaff(activeRole)}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Staff Management</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/(admin)/staff/add')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.segmentedControl,
          { backgroundColor: theme.surfaceTertiary },
        ]}
      >
        {ROLES.map((role) => {
          const isActive = activeRole === role.key;
          return (
            <TouchableOpacity
              key={role.key}
              onPress={() => setActiveRole(role.key)}
              activeOpacity={0.7}
              style={[
                styles.segment,
                isActive && { backgroundColor: theme.surface, ...shadows.card },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isActive ? theme.primary : theme.textTertiary },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {role.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={staff}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={staff.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.lg },
  emptyList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: typography.sm, marginTop: spacing.md },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  cardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  cardName: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  cardEmail: {
    fontSize: typography.xs,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteTouch: {
    paddingLeft: spacing.sm,
  },

  errorText: { fontSize: typography.sm, marginTop: spacing.md },
  retryText: { fontWeight: '600', fontSize: typography.sm, marginTop: spacing.sm },
});
