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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { APPOINTMENT_STATUS } from '@/shared/constants/appointmentStatus';
import { labReportService } from '@/features/records/services/labReport.service';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Badge } from '@/components/ui';
import type { ApiSuccessResponse, Appointment, User, LabReport, LabResultFlag } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

type PatientOption = {
  patientId: string;
  patientName: string;
};

const LAB_TYPE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  hematology: 'droplet',
  biochemistry: 'trending-up',
  microbiology: 'search',
  urinalysis: 'eye',
  radiology: 'monitor',
  serology: 'activity',
  pathology: 'crosshair',
  other: 'more-horizontal',
};

function getStatusBadge(status: string): { variant: 'warning' | 'info' | 'primary' | 'success' | 'accent' } {
  switch (status) {
    case 'pending': return { variant: 'warning' };
    case 'sample_collected': return { variant: 'info' };
    case 'in_progress': return { variant: 'primary' };
    case 'completed': return { variant: 'success' };
    case 'reviewed': return { variant: 'accent' };
    default: return { variant: 'neutral' };
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getFlagColor(flag: LabResultFlag, colors: typeof Colors.light): string {
  switch (flag) {
    case 'normal': return colors.success || '#1A8C4E';
    case 'high': return '#D97706';
    case 'low': return '#3B82F6';
    case 'critical': return colors.error || '#DC3545';
  }
}

export default function LabReportsIndexScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[] }>>(
          ENDPOINTS.APPOINTMENTS.MY_DOCTOR_SCHEDULE,
        );
        const appointments = res.data.data.appointments;
        const seen = new Set<string>();
        const options: PatientOption[] = [];

        for (const appt of appointments) {
          if (appt.status === APPOINTMENT_STATUS.CANCELLED) continue;
          const patient = appt.patientId;
          if (typeof patient !== 'object' || !patient || !('_id' in patient)) continue;
          const user = patient as User;
          if (seen.has(user._id)) continue;
          seen.add(user._id);
          options.push({ patientId: user._id, patientName: user.name });
        }

        setPatients(options);
      } catch {
      } finally {
        setLoadingPatients(false);
      }
    };
    void loadPatients();
  }, []);

  const fetchLabReports = useCallback(async (patientId: string) => {
    setLoadingReports(true);
    try {
      const data = await labReportService.getPatientLabReports(patientId);
      setLabReports(data);
    } catch {
      setLabReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      void fetchLabReports(selectedPatientId);
    }
  }, [selectedPatientId, fetchLabReports]);

  const handleRefresh = useCallback(() => {
    if (!selectedPatientId) return;
    setRefreshing(true);
    void fetchLabReports(selectedPatientId).finally(() => setRefreshing(false));
  }, [selectedPatientId, fetchLabReports]);

  const renderPatientChip = useCallback(({ item }: { item: PatientOption }) => {
    const isSelected = selectedPatientId === item.patientId;
    return (
      <TouchableOpacity
        style={[
          styles.patientChip,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => setSelectedPatientId(item.patientId)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.patientChipText,
            { color: isSelected ? '#FFFFFF' : colors.text },
          ]}
          numberOfLines={1}
        >
          {item.patientName}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedPatientId, colors]);

  const renderLabReport = useCallback(({ item }: { item: LabReport }) => {
    const statusBadge = getStatusBadge(item.status);
    const displayDate = new Date(item.testDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const icon = LAB_TYPE_ICONS[item.labType] ?? 'file-text';

    const doctorName = typeof item.doctorId === 'object' && item.doctorId?.userId
      ? (item.doctorId.userId as { name?: string }).name ?? 'Unknown'
      : 'Unknown';

    return (
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/(doctor)/lab-reports/${item._id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.reportCardTop}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
            <Feather name={icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={[styles.reportType, { color: colors.text }]}>
              {item.labType.charAt(0).toUpperCase() + item.labType.slice(1)}
            </Text>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={12} color={colors.textTertiary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{displayDate}</Text>
            </View>
          </View>
          <Badge label={formatStatus(item.status)} variant={statusBadge.variant} size="sm" />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.resultFlags}>
          {(item.results ?? []).slice(0, 4).map((r, i) => (
            <View
              key={i}
              style={[
                styles.flagDot,
                { backgroundColor: getFlagColor(r.flag, colors) },
              ]}
            />
          ))}
          {item.results && item.results.length > 4 && (
            <Text style={[styles.moreFlags, { color: colors.textTertiary }]}>
              +{item.results.length - 4}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [colors, router]);

  const ListHeaderComponent = useMemo(() => (
    <View style={{ paddingBottom: spacing.sm }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Lab Reports</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(doctor)/lab-reports/add')}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.patientLabel, { color: colors.textSecondary }]}>Select Patient</Text>
      {patients.length > 0 ? (
        <FlatList
          horizontal
          data={patients}
          keyExtractor={(item) => item.patientId}
          renderItem={renderPatientChip}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.patientList}
        />
      ) : (
        <View style={[styles.hintBox, { backgroundColor: colors.surfaceTertiary }]}>
          <Feather name="users" size={18} color={colors.textTertiary} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            No patients with appointments found.
          </Text>
        </View>
      )}
    </View>
  ), [colors, patients, renderPatientChip, router]);

  const ListEmptyComponent = useMemo(() => {
    if (!selectedPatientId) {
      return (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Select a patient above to view their lab reports.
          </Text>
        </View>
      );
    }
    if (loadingReports) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Feather name="file-text" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No lab reports yet for this patient.
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(doctor)/lab-reports/add')}
        >
          <Text style={styles.createButtonText}>Create Lab Report</Text>
        </TouchableOpacity>
      </View>
    );
  }, [selectedPatientId, loadingReports, colors, router]);

  if (loadingPatients) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={selectedPatientId ? labReports : []}
        keyExtractor={(item) => item._id}
        renderItem={renderLabReport}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={
          selectedPatientId && labReports.length === 0
            ? styles.emptyContainer
            : styles.listContainer
        }
        refreshControl={
          selectedPatientId ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingBottom: TAB_BAR_HEIGHT + spacing.lg, paddingHorizontal: spacing.md },
  emptyContainer: { flex: 1, paddingBottom: TAB_BAR_HEIGHT + spacing.lg, paddingHorizontal: spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  patientLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  patientList: { paddingHorizontal: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  patientChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  patientChipText: { fontSize: 13, fontWeight: '600' },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: { fontSize: 13, flex: 1 },

  reportCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.card,
  },
  reportCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: { flex: 1 },
  reportType: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, fontWeight: '500' },

  divider: { height: 1, marginTop: spacing.sm, marginBottom: spacing.sm },

  resultFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreFlags: { fontSize: 11, fontWeight: '600' },

  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: 12,
    paddingTop: 80,
  },
  emptyText: { fontSize: 15, textAlign: 'center' },
  createButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
  },
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
