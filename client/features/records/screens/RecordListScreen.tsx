import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { recordService } from '../services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { PopulatedMedicalRecord } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

interface Props {
  patientId?: string;
  onPressRecord?: (record: PopulatedMedicalRecord) => void;
}

export default function RecordListScreen({ patientId, onPressRecord }: Props) {
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const targetPatientId = patientId ?? user?._id;

  const [records, setRecords] = useState<PopulatedMedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!targetPatientId) return;
    try {
      setError(null);
      const data = await recordService.getPatientHistory(targetPatientId);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records.');
    }
  }, [targetPatientId]);

  useEffect(() => {
    setLoading(true);
    fetchRecords().finally(() => setLoading(false));
  }, [fetchRecords]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  }, [fetchRecords]);

  const renderRecord = useCallback(({ item }: { item: PopulatedMedicalRecord }) => {
    const dateStr = new Date(item.dateRecorded).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => onPressRecord?.(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.diagnosis, { color: theme.text }]} numberOfLines={2}>
          {item.diagnosis}
        </Text>
        <View style={styles.dateRow}>
          <Feather name="calendar" size={13} color={theme.textTertiary} />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>{dateStr}</Text>
        </View>
        {item.prescription && (
          <Text style={[styles.prescription, { color: theme.textSecondary }]} numberOfLines={2}>
            Rx: {item.prescription}
          </Text>
        )}
        {item.labReportUrl && (
          <View style={[styles.attachmentTag, { backgroundColor: theme.infoBg }]}>
            <Feather name="paperclip" size={13} color={theme.info} />
            <Text style={[styles.attachmentText, { color: theme.info }]}>Lab Report</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [theme, onPressRecord]);

  const keyExtractor = useCallback((item: PopulatedMedicalRecord) => item._id, []);

  const ListHeaderComponent = useMemo(() => (
    <Text style={[styles.header, { color: theme.text }]}>Medical Records</Text>
  ), [theme]);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContent}>
      <Feather name="file-text" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No medical records found.</Text>
    </View>
  ), [theme]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        <TouchableOpacity onPress={fetchRecords}>
          <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={keyExtractor}
      renderItem={renderRecord}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.listContainer}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  header: { fontSize: 22, fontWeight: '700', marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  diagnosis: { fontSize: 16, fontWeight: '600', marginBottom: spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  dateText: { fontSize: 13 },
  prescription: { fontSize: 14, marginTop: spacing.xs },
  attachmentTag: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  attachmentText: { fontSize: 12, fontWeight: '600' },
  errorText: { fontSize: 15, marginBottom: spacing.sm },
  retryText: { fontWeight: '600', fontSize: 15 },
  emptyContent: { justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 16 },
});