import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { invoiceService, formatCurrency } from '@/features/billing/services/invoice.service';
import type { InvoiceStats } from '@/shared/types';

interface StatsCardProps {
  onRefresh?: () => void;
}

export function StatsCard({ onRefresh }: StatsCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await invoiceService.getInvoiceStats();
      setStats(data);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats.');
    }
  }, [onRefresh]);

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (error && !stats) {
    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={14} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
        <TouchableOpacity onPress={fetchStats} style={styles.retryButton}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) return null;

  const statChips = [
    {
      key: 'total',
      label: 'Total',
      value: stats.totalInvoices.toString(),
      sub: formatCurrency(stats.totalAmount),
      color: theme.primary,
      bg: theme.primaryMuted,
    },
    {
      key: 'unpaid',
      label: 'Unpaid',
      value: stats.byStatus.Unpaid?.count.toString() ?? '0',
      sub: formatCurrency(stats.byStatus.Unpaid?.total ?? 0),
      color: theme.error,
      bg: theme.errorBg,
    },
    {
      key: 'pending',
      label: 'Pending',
      value: stats.byStatus['Pending Verification']?.count.toString() ?? '0',
      sub: formatCurrency(stats.byStatus['Pending Verification']?.total ?? 0),
      color: theme.warning,
      bg: theme.warningBg,
    },
    {
      key: 'paid',
      label: 'Paid',
      value: stats.byStatus.Paid?.count.toString() ?? '0',
      sub: formatCurrency(stats.byStatus.Paid?.total ?? 0),
      color: theme.success,
      bg: theme.successBg,
    },
    {
      key: 'thisMonth',
      label: 'This Month',
      value: stats.thisMonth.count.toString(),
      sub: formatCurrency(stats.thisMonth.total),
      color: theme.info,
      bg: theme.infoBg,
    },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>
          INVOICE OVERVIEW
        </Text>
        <TouchableOpacity onPress={fetchStats} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="refresh-cw" size={14} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        contentContainerStyle={styles.chipsContainer}
      >
        {statChips.map((chip) => (
          <View
            key={chip.key}
            style={[styles.chip, { backgroundColor: chip.bg, borderColor: chip.color }]}
          >
            <Text style={[styles.chipLabel, { color: chip.color }]}>{chip.label}</Text>
            <Text style={[styles.chipValue, { color: chip.color }]}>{chip.value}</Text>
            <Text style={[styles.chipSub, { color: chip.color, opacity: 0.7 }]}>{chip.sub}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default StatsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  chipsContainer: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 110,
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  chipSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: 13,
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontWeight: '600',
    fontSize: 13,
  },
});
