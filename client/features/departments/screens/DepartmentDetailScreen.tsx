import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { departmentService } from '../services/department.service';
import type { Department } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

export default function DepartmentDetailScreen() {
  const { id: departmentId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const c = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departmentService
      .getDepartmentById(departmentId)
      .then(setDepartment)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load department.'))
      .finally(() => setLoading(false));
  }, [departmentId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error || !department) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Feather name="alert-circle" size={48} color={c.error} />
        <Text style={[styles.errorText, { color: c.error }]}>{error ?? 'Department not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';
  const initial = department.name ? department.name.charAt(0).toUpperCase() : 'D';
  const isActive = department.status === 'active';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: c.accent }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={[styles.name, { color: c.text }]}>{department.name}</Text>
        <View style={styles.roleRow}>
          <View style={[styles.roleBadge, { backgroundColor: c.primaryMuted }]}>
            <Text style={[styles.roleBadgeText, { color: c.primary }]}>Department</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? c.success : c.textTertiary },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? c.success : c.textTertiary },
            ]}
          >
            {department.status}
          </Text>
        </View>
      </View>

      <View style={[styles.card, shadows.card, { backgroundColor: c.surface }]}>
        <Detail
          label="Location"
          value={department.location}
          labelColor={c.textSecondary}
          valueColor={c.text}
        />
        <View style={[styles.divider, { backgroundColor: c.divider }]} />
        <Detail
          label="Phone"
          value={department.phone}
          labelColor={c.textSecondary}
          valueColor={c.text}
        />
        {department.description && (
          <>
            <View style={[styles.divider, { backgroundColor: c.divider }]} />
            <Detail
              label="Description"
              value={department.description}
              labelColor={c.textSecondary}
              valueColor={c.text}
            />
          </>
        )}
      </View>

      {isAdmin && (
        <View style={styles.adminSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.primary }]}
            onPress={() => Alert.alert(
              'Edit Department',
              'Edit functionality will be available in a future update.',
            )}
          >
            <Feather name="edit-2" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.actionButtonText}>Edit Department</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.error }]}
            onPress={() => {
              Alert.alert(
                'Delete Department',
                `Are you sure you want to delete ${department.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await departmentService.deleteDepartment(department._id);
                        Alert.alert('Deleted', 'Department has been removed.');
                        router.back();
                      } catch (err) {
                        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete department.');
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Feather name="trash-2" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.actionButtonText}>Delete Department</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Detail({
  label,
  value,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: typography.md, marginTop: spacing.sm },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: typography.bold, color: '#FFFFFF' },
  name: { fontSize: typography.xxl, fontWeight: typography.bold, marginBottom: spacing.xs },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: typography.xs, fontWeight: typography.medium },

  // Detail Card
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  divider: { height: 1, marginVertical: spacing.md },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailValue: {
    fontSize: typography.md,
    fontWeight: typography.regular,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  adminSection: { marginTop: spacing.xs, gap: spacing.sm },
});
