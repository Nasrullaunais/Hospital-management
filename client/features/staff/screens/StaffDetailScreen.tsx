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
import { staffService } from '../services/staff.service';
import type { User } from '@/shared/types';

export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const c = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);

  const [staff, setStaff] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await staffService.getStaffById(id);
        if (!cancelled) setStaff(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load staff.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error || !staff) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Feather name="alert-circle" size={48} color={c.error} />
        <Text style={[styles.errorText, { color: c.error }]}>{error ?? 'Staff not found.'}</Text>
      </View>
    );
  }

  const initial = staff.name ? staff.name.charAt(0).toUpperCase() : 'S';
  const isActive = staff.isActive !== false;
  const roleBadgeBg = staff.role === 'pharmacist' ? c.successBg : c.infoBg;
  const roleBadgeText = staff.role === 'pharmacist' ? c.success : c.info;
  const roleLabel = staff.role.charAt(0).toUpperCase() + staff.role.slice(1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: c.accent }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={[styles.name, { color: c.text }]}>{staff.name}</Text>
        <View style={styles.roleRow}>
          <View style={[styles.roleBadge, { backgroundColor: roleBadgeBg }]}>
            <Text style={[styles.roleBadgeText, { color: roleBadgeText }]}>
              {roleLabel}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? c.success : c.error },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? c.success : c.error },
            ]}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={[styles.card, shadows.card, { backgroundColor: c.surface }]}>
        <Detail
          label="Email"
          value={staff.email}
          labelColor={c.textSecondary}
          valueColor={c.text}
        />
        {staff.phone && (
          <>
            <View style={[styles.divider, { backgroundColor: c.divider }]} />
            <Detail
              label="Phone"
              value={staff.phone}
              labelColor={c.textSecondary}
              valueColor={c.text}
            />
          </>
        )}
        <View style={[styles.divider, { backgroundColor: c.divider }]} />
        <Detail
          label="Created"
          value={formatDate(staff.createdAt)}
          labelColor={c.textSecondary}
          valueColor={c.text}
        />
      </View>

      <View style={styles.adminSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: c.primary }]}
          onPress={() => router.push(`/(admin)/staff/${id}/edit` as any)}
        >
          <Feather name="edit-2" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.actionButtonText}>Edit Staff</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: c.error }]}
          onPress={() => {
            Alert.alert('Delete Staff', `Are you sure you want to delete ${staff.name}?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await staffService.deleteStaff(id);
                    Alert.alert('Deleted', 'Staff has been removed.');
                    router.back();
                  } catch (err) {
                    Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete staff.');
                  }
                },
              },
            ]);
          }}
        >
          <Feather name="trash-2" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
          <Text style={styles.actionButtonText}>Delete Staff</Text>
        </TouchableOpacity>
      </View>
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
