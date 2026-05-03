import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { recordService } from '@/features/records/services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import { Config } from '@/shared/constants/Config';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Badge } from '@/components/ui';
import type { PopulatedMedicalRecord } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getRecordTypeBadge(record: PopulatedMedicalRecord): { label: string; variant: 'info' | 'success' | 'accent' } {
  if (record.labReportUrl) return { label: 'Lab', variant: 'info' };
  if (record.prescription) return { label: 'Rx', variant: 'success' };
  return { label: 'Visit', variant: 'accent' };
}

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [records, setRecords] = useState<PopulatedMedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      if (user.role === 'patient') {
        const data = await recordService.getPatientHistory(user._id);
        setRecords(data);
      } else if (user.role === 'doctor') {
        const data = await recordService.getDoctorLogs();
        setRecords(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load records.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchRecords();
  };

  const openLabReport = async (labReportUrl: string) => {
    const fullUrl = `${Config.BASE_URL}${labReportUrl}`;
    await WebBrowser.openBrowserAsync(fullUrl);
  };

  const renderRecord = ({ item }: { item: PopulatedMedicalRecord }) => {
    const isPatientView = user?.role === 'patient';
    const displayDate = new Date(item.dateRecorded).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const recordBadge = getRecordTypeBadge(item);
    const patientName = isPatientView
      ? `Dr. ${item.doctorId.userId.name}`
      : item.patientId.name;
    const patientInitials = getInitials(patientName);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(doctor)/records/${item._id}`)}
      >
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
          <View style={styles.cardTop}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{patientInitials}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                {isPatientView ? patientName : item.patientId.name}
              </Text>
              <View style={styles.dateRow}>
                <Feather name="calendar" size={12} color={colors.textTertiary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{displayDate}</Text>
              </View>
            </View>
            <Badge label={recordBadge.label} variant={recordBadge.variant} size="sm" />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <Text style={[styles.diagnosisLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
          <Text style={[styles.diagnosisValue, { color: colors.text }]} numberOfLines={2}>
            {item.diagnosis}
          </Text>

          {item.labReportUrl ? (
            <TouchableOpacity
              style={[styles.reportButton, { backgroundColor: colors.infoBg, borderColor: colors.info }]}
              onPress={() => void openLabReport(item.labReportUrl!)}
            >
              <Feather name="file-text" size={14} color={colors.info} />
              <Text style={[styles.reportButtonText, { color: colors.info }]}>View Lab Report</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => void fetchRecords()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {user?.role === 'doctor' ? 'Patient Logs' : 'Medical History'}
        </Text>
        {user?.role === 'doctor' ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.labButton, { borderColor: colors.primary }]}
              onPress={() => router.push('/(doctor)/lab-reports')}
            >
              <Feather name="file-text" size={16} color={colors.primary} />
              <Text style={[styles.labButtonText, { color: colors.primary }]}>Lab Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(doctor)/records/add-record')}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add Record</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item._id}
        renderItem={renderRecord}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.list}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="file-text" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {user?.role === 'doctor' ? 'No records created yet.' : 'No medical history found.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  labButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  labButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  diagnosisLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  diagnosisValue: {
    fontSize: 15,
    lineHeight: 21,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  reportButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
