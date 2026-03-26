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
import { recordService } from '../services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { MedicalRecord, PopulatedMedicalRecord } from '@/shared/types';

interface Props {
  /**
   * Patient ID whose records to display.
   * Defaults to the authenticated user's own ID.
   */
  patientId?: string;
  onPressRecord?: (record: PopulatedMedicalRecord) => void;
}

/**
 * RecordListScreen — Member 4
 * Lists all medical records belonging to the patient.
 * TODO: Wire onPressRecord to navigate to RecordDetailScreen.
 * TODO: Doctors: Add "Create Record" button (visible for doctor role).
 * TODO: Add search/filter by diagnosis or date.
 */
export default function RecordListScreen({ patientId, onPressRecord }: Props) {
  const { user } = useAuth();
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  };

  const renderRecord = ({ item }: { item: PopulatedMedicalRecord }) => (
    <TouchableOpacity style={styles.card} onPress={() => onPressRecord?.(item)}>
      <Text style={styles.diagnosis} numberOfLines={2}>
        {item.diagnosis}
      </Text>
      <Text style={styles.date}>
        📅 {new Date(item.dateRecorded).toLocaleDateString()}
      </Text>
      {item.prescription && (
        <Text style={styles.prescription} numberOfLines={2}>
          Rx: {item.prescription}
        </Text>
      )}
      {item.labReportUrl && (
        <View style={styles.attachmentTag}>
          <Text style={styles.attachmentText}>📎 Lab report attached</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchRecords}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item._id}
      renderItem={renderRecord}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={
        records.length === 0 ? styles.emptyContainer : styles.listContainer
      }
      ListHeaderComponent={<Text style={styles.header}>Medical Records</Text>}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No medical records found.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 12, paddingTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  diagnosis: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 6 },
  date: { fontSize: 12, color: '#888', marginBottom: 4 },
  prescription: { fontSize: 13, color: '#555', marginTop: 4 },
  attachmentTag: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  attachmentText: { fontSize: 12, color: '#3b82f6' },
  errorText: { color: '#ef4444', fontSize: 15, marginBottom: 12 },
  retryText: { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});
