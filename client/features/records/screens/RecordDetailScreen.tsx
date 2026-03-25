import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { recordService } from '../services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { MedicalRecord } from '@/shared/types';

interface Props {
  recordId: string;
  onDeleted?: () => void;
}

/**
 * RecordDetailScreen — Member 4
 * Full view of a single medical record.
 * TODO: Accept `recordId` from Expo Router navigation params.
 * TODO: Doctor: add inline edit form.
 * TODO: Patient: open labReportUrl in a WebView or native browser.
 */
export default function RecordDetailScreen({ recordId, onDeleted }: Props) {
  const { user } = useAuth();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    recordService
      .getRecordById(recordId)
      .then(setRecord)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load record.'))
      .finally(() => setLoading(false));
  }, [recordId]);

  const handleDelete = () => {
    Alert.alert('Delete Record', 'This action cannot be undone. Delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await recordService.deleteRecord(recordId);
            onDeleted?.();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete record.');
          }
        },
      },
    ]);
  };

  const openLabReport = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the lab report.');
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Record not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Medical Record</Text>
      <Text style={styles.date}>
        Recorded: {new Date(record.dateRecorded).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>

      <Section label="Diagnosis">
        <Text style={styles.body}>{record.diagnosis}</Text>
      </Section>

      {record.prescription && (
        <Section label="Prescription">
          <Text style={styles.body}>{record.prescription}</Text>
        </Section>
      )}

      {record.labReportUrl && (
        <Section label="Lab Report">
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => openLabReport(record.labReportUrl!)}
          >
            <Text style={styles.reportButtonText}>📄 View Lab Report</Text>
          </TouchableOpacity>
        </Section>
      )}

      {isAdmin && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Record</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  date: { fontSize: 13, color: '#888', marginBottom: 20 },
  section: {
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  body: { fontSize: 15, color: '#374151', lineHeight: 22 },
  reportButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  reportButtonText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  deleteButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  errorText: { color: '#ef4444', fontSize: 15 },
});
