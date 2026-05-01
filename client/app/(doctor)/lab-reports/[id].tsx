import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { isAxiosError } from 'axios';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { labReportService } from '@/features/records/services/labReport.service';
import { reportService } from '@/features/records/services/report.service';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Badge, Button } from '@/components/ui';
import type { LabReport, LabReportStatus, LabResult, User, Doctor } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

const STATUS_BADGE_VARIANT: Record<
  LabReportStatus,
  'warning' | 'info' | 'primary' | 'success' | 'accent'
> = {
  pending: 'warning',
  sample_collected: 'info',
  in_progress: 'primary',
  completed: 'success',
  reviewed: 'accent',
};

const STATUS_LABEL: Record<LabReportStatus, string> = {
  pending: 'Pending',
  sample_collected: 'Sample Collected',
  in_progress: 'In Progress',
  completed: 'Completed',
  reviewed: 'Reviewed',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getPatientName(report: LabReport): string {
  if (typeof report.patientId === 'object' && report.patientId && '_id' in report.patientId) {
    return (report.patientId as User).name;
  }
  return 'Patient';
}

function getDoctorName(report: LabReport): string {
  if (typeof report.doctorId === 'object' && report.doctorId && '_id' in report.doctorId) {
    return (report.doctorId as Doctor).userId?.name ?? 'Doctor';
  }
  return 'Doctor';
}

function getDoctorSpecialization(report: LabReport): string {
  if (typeof report.doctorId === 'object' && report.doctorId && '_id' in report.doctorId) {
    return (report.doctorId as Doctor).specialization ?? '';
  }
  return '';
}

function getFlagColors(
  flag: string,
  colors: typeof Colors.light,
): { color: string; bg: string } {
  switch (flag) {
    case 'normal':
      return { color: colors.success, bg: colors.successBg || '#E6F5EC' };
    case 'high':
      return { color: '#D97706', bg: '#FEF3C7' };
    case 'low':
      return { color: '#3B82F6', bg: '#DBEAFE' };
    case 'critical':
      return { color: colors.error, bg: colors.errorBg || '#FEE2E2' };
    default:
      return { color: colors.textSecondary, bg: colors.surfaceTertiary };
  }
}

export default function LabReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [report, setReport] = useState<LabReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await labReportService.getLabReportById(id);
      setReport(data);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setError('Lab report not found.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load lab report.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const handleReview = async () => {
    if (!id) return;
    try {
      setReviewing(true);
      await labReportService.reviewLabReport(id);
      await fetchReport();
      Alert.alert('Success', 'Lab report marked as reviewed.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to review report.');
    } finally {
      setReviewing(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      setCompleting(true);
      await labReportService.updateLabReport(id, { status: 'completed' });
      await fetchReport();
      Alert.alert('Success', 'Lab report marked as completed. You can now generate the PDF.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete report.');
    } finally {
      setCompleting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!id) return;
    try {
      setGeneratingPDF(true);
      const result = await reportService.generateLabReport(id);
      const supported = await Linking.canOpenURL(result.downloadUrl);
      if (supported) {
        await Linking.openURL(result.downloadUrl);
      } else {
        Alert.alert('Cannot Open URL', 'Unable to open the download link.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Stack.Screen
          options={{
            title: 'Lab Report',
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading lab report…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Stack.Screen
          options={{
            title: 'Lab Report',
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return null;
  }

  const displayDate = new Date(report.testDate || report.createdAt).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  );
  const initials = getInitials(getPatientName(report));
  const statusVariant = STATUS_BADGE_VARIANT[report.status];
  const statusLabel = STATUS_LABEL[report.status];
  const doctorName = getDoctorName(report);
  const doctorSpecialization = getDoctorSpecialization(report);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          title: 'Lab Report',
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
          ]}
        >
          <View
            style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.patientName, { color: colors.text }]}>
              {getPatientName(report)}
            </Text>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={13} color={colors.textTertiary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {displayDate}
              </Text>
            </View>
          </View>
          <Badge label={report.labType} variant="primary" size="sm" />
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <Badge label={statusLabel} variant={statusVariant} size="md" />
        </View>

        {/* Doctor Info Row */}
        <View
          style={[
            styles.doctorRow,
            { backgroundColor: colors.surfaceTertiary },
          ]}
        >
          <Feather name="stethoscope" size={14} color={colors.textSecondary} />
          <Text style={[styles.doctorName, { color: colors.textSecondary }]}>
            Dr. {doctorName}
            {doctorSpecialization ? ` · ${doctorSpecialization}` : ''}
          </Text>
        </View>

        {/* Results Table Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Test Results
          </Text>

          {/* Table Header */}
          <View style={[styles.tableHeader, { borderBottomColor: colors.divider }]}>
            <Text
              style={[styles.tableHeaderCell, { color: colors.textTertiary, flex: 2 }]}
            >
              Parameter
            </Text>
            <Text
              style={[
                styles.tableHeaderCell,
                { color: colors.textTertiary, flex: 1, textAlign: 'right' },
              ]}
            >
              Result
            </Text>
            <Text
              style={[
                styles.tableHeaderCell,
                { color: colors.textTertiary, flex: 1.2, textAlign: 'center' },
              ]}
            >
              Unit
            </Text>
            <Text
              style={[
                styles.tableHeaderCell,
                { color: colors.textTertiary, flex: 1.5, textAlign: 'center' },
              ]}
            >
              Ref Range
            </Text>
            <Text
              style={[
                styles.tableHeaderCell,
                { color: colors.textTertiary, flex: 0.8, textAlign: 'center' },
              ]}
            >
              Flag
            </Text>
          </View>

          {/* Table Rows */}
          {report.results.map((result: LabResult, index: number) => {
            const flagColors = getFlagColors(result.flag, colors);
            const isEven = index % 2 === 0;
            return (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor: isEven ? colors.surface : colors.surfaceTertiary,
                    borderBottomColor: colors.divider,
                  },
                ]}
              >
                <Text
                  style={[styles.tableCell, { color: colors.text, flex: 2 }]}
                >
                  {result.parameter}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.text, flex: 1, textAlign: 'right', fontWeight: '600' },
                  ]}
                >
                  {result.value}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textSecondary, flex: 1.2, textAlign: 'center' },
                  ]}
                >
                  {result.unit}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { color: colors.textTertiary, flex: 1.5, textAlign: 'center' },
                  ]}
                >
                  {result.normalRange ?? '—'}
                </Text>
                <View style={{ flex: 0.8, alignItems: 'center' }}>
                  <View
                    style={[
                      styles.flagBadge,
                      { backgroundColor: flagColors.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.flagBadgeText,
                        { color: flagColors.color },
                      ]}
                    >
                      {result.flag.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Interpretation Card */}
        {report.interpretation ? (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Interpretation
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {report.interpretation}
            </Text>
          </View>
        ) : null}

        {/* Notes Card */}
        {report.notes ? (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, shadowColor: '#1B2A4A' },
            ]}
          >
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              Notes
            </Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {report.notes}
            </Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {report.status === 'completed' || report.status === 'reviewed' ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.successBg || '#E6F5EC',
                  borderColor: colors.success,
                },
              ]}
              onPress={() => void handleGeneratePDF()}
              disabled={generatingPDF}
            >
              {generatingPDF ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <Feather name="file-text" size={18} color={colors.success} />
              )}
              <Text
                style={[
                  styles.actionButtonText,
                  { color: colors.success },
                ]}
              >
                {generatingPDF ? 'Generating...' : 'Generate PDF Report'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {report.status !== 'reviewed' ? (
            report.status === 'pending' || report.status === 'sample_collected' ? (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.warningBg || '#FEF3C7',
                    borderColor: colors.warning || '#D97706',
                  },
                ]}
                onPress={() => void handleComplete()}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color={colors.warning || '#D97706'} />
                ) : (
                  <Feather name="check-circle" size={18} color={colors.warning || '#D97706'} />
                )}
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.warning || '#D97706' },
                  ]}
                >
                  {completing ? 'Completing...' : 'Mark as Completed'}
                </Text>
              </TouchableOpacity>
            ) : report.status === 'in_progress' ? (
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.warningBg || '#FEF3C7',
                      borderColor: colors.warning || '#D97706',
                    },
                  ]}
                  onPress={() => void handleComplete()}
                  disabled={completing}
                >
                  {completing ? (
                    <ActivityIndicator size="small" color={colors.warning || '#D97706'} />
                  ) : (
                    <Feather name="check-circle" size={18} color={colors.warning || '#D97706'} />
                  )}
                  <Text style={[styles.actionButtonText, { color: colors.warning || '#D97706' }]}>
                    {completing ? 'Completing...' : 'Mark as Completed'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.primaryMuted,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => void handleReview()}
                  disabled={reviewing}
                >
                  {reviewing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="check-circle" size={18} color={colors.primary} />
                  )}
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    {reviewing ? 'Marking...' : 'Mark as Reviewed'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => void handleReview()}
                disabled={reviewing}
              >
                {reviewing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="check-circle" size={18} color={colors.primary} />
                )}
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  {reviewing ? 'Marking...' : 'Mark as Reviewed'}
                </Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      </ScrollView>
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: 15,
  },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.lg,
    gap: 12,
  },
  profileCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    padding: 12,
  },
  doctorName: {
    fontSize: 13,
    flex: 1,
  },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableCell: {
    fontSize: 13,
  },
  flagBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  flagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
  },
  infoBoxText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
