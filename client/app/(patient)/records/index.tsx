import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { recordService } from '@/features/records/services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { PopulatedMedicalRecord } from '@/shared/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { TAB_BAR_HEIGHT } from '@/shared/constants/Config';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [records, setRecords] = useState<PopulatedMedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'patient') {
        const data = await recordService.getPatientHistory(user._id);
        setRecords(data);
      } else if (user.role === 'doctor') {
        const data = await recordService.getDoctorLogs();
        setRecords(data);
      }
    } catch (err: unknown) {
      console.error('fetchRecords failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleRefresh = () => {
    setError(null);
    setRefreshing(true);
    void fetchRecords();
  };

  const isPatientView = user?.role === 'patient';

  const renderRecord = ({ item }: { item: PopulatedMedicalRecord }) => {
    const displayDate = new Date(item.dateRecorded).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const doctorName = isPatientView && item.doctorId?.userId?.name
      ? `Dr. ${item.doctorId.userId.name}`
      : '';
    const doctorInitials = doctorName
      ? doctorName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
      : 'DR';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => {
          if (item._id) router.push(`/(patient)/records/${item._id}` as Href);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {doctorInitials}
            </Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.diagnosis, { color: theme.text }]} numberOfLines={2}>
              {item.diagnosis}
            </Text>
            {doctorName && (
              <Text style={[styles.doctorName, { color: theme.primary }]}>
                {doctorName}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Feather name="calendar" size={12} color={theme.textTertiary} />
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {displayDate}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textTertiary} />
        </View>

        {item.prescription && (
          <View style={[styles.prescriptionBox, { borderTopColor: theme.divider }]}>
            <Text style={[styles.prescriptionLabel, { color: theme.textTertiary }]}>
              Prescription
            </Text>
            <Text
              style={[styles.prescriptionText, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.prescription}
            </Text>
          </View>
        )}

        {item.labReportUrl && (
          <View style={styles.tagRow}>
            <View style={[styles.attachmentTag, { backgroundColor: theme.infoBg }]}>
              <Feather name="paperclip" size={12} color={theme.info} />
              <Text style={[styles.attachmentText, { color: theme.info }]}>
                Lab Report
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.surfaceTertiary }]}
    >
      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        renderItem={renderRecord}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="file-text" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No medical history found.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
    gap: spacing.md,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyContent: { justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 16, textAlign: 'center' },

  // Card
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  diagnosis: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },

  // Prescription
  prescriptionBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  prescriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  prescriptionText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Tag
  tagRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
  },
  attachmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  attachmentText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
