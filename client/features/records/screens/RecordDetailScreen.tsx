import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { recordService } from '../services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { MedicalRecord } from '@/shared/types';
import { spacing, radius } from '@/constants/ThemeTokens';

interface Props {
  recordId?: string;
  onDeleted?: () => void;
}

export default function RecordDetailScreen({ recordId: propRecordId, onDeleted }: Props) {
  const routeParams = useLocalSearchParams<{ recordId?: string }>();
  const recordId = propRecordId ?? routeParams.recordId;
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecord() {
      if (!recordId) {
        setError('Record ID is missing.');
        setLoading(false);
        return;
      }
      try {
        const data = await recordService.getRecordById(recordId);
        setRecord(data);
          } catch (err: unknown) {
        console.error('getRecordById failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load record.');
      } finally {
        setLoading(false);
      }
    }
    void loadRecord();
  }, [recordId]);

  const handleDelete = () => {
    Alert.alert('Delete Record', 'This action cannot be undone. Delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!recordId) return;
          try {
            await recordService.deleteRecord(recordId);
            onDeleted?.();
      } catch (err: unknown) {
            console.error('deleteRecord failed:', err);
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete record.');
          }
        },
      },
    ]);
  };

  const openLabReport = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.error }]}>{error ?? 'Record not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Medical Record</Text>
      <Text style={[styles.date, { color: theme.textTertiary }]}>
        Recorded: {new Date(record.dateRecorded).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      <View style={[styles.section, { borderTopColor: theme.divider }]}>
        <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Diagnosis</Text>
        <Text style={[styles.body, { color: theme.text }]}>{record.diagnosis}</Text>
      </View>

      {record.prescription && (
        <View style={[styles.section, { borderTopColor: theme.divider }]}>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Prescription</Text>
          <Text style={[styles.body, { color: theme.text }]}>{record.prescription}</Text>
        </View>
      )}

      {record.labReportUrl && (
        <View style={[styles.section, { borderTopColor: theme.divider }]}>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>Lab Report</Text>
          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: theme.infoBg }]}
            onPress={() => openLabReport(record.labReportUrl!)}
          >
            <Text style={[styles.reportButtonText, { color: theme.info }]}>📄 View Lab Report</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && (
        <TouchableOpacity style={[styles.deleteButton, { borderColor: theme.error }]} onPress={handleDelete}>
          <Text style={[styles.deleteButtonText, { color: theme.error }]}>Delete Record</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: spacing.xs },
  date: { fontSize: 13, marginBottom: spacing.lg },
  section: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  body: { fontSize: 15, lineHeight: 22 },
  reportButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  reportButtonText: { fontWeight: '600', fontSize: 14 },
  deleteButton: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteButtonText: { fontWeight: '600', fontSize: 15 },
  errorText: { fontSize: 15 },
});