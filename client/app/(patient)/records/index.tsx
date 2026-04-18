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
import { SymbolView } from 'expo-symbols';
import { useRouter, type Href } from 'expo-router';
import { recordService } from '@/features/records/services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { PopulatedMedicalRecord } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

import { spacing } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [records, setRecords] = useState<PopulatedMedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    } catch {
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

  const isPatientView = user?.role === 'patient';

  const renderRecord = ({ item }: { item: PopulatedMedicalRecord }) => {
    const displayDate = new Date(item.dateRecorded).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push(`/(patient)/records/${item._id}` as Href)}
      >
        <Text style={[styles.diagnosis, { color: theme.text }]}>{item.diagnosis}</Text>

        <Text style={[styles.subLabel, { color: theme.primary }]}>
          {isPatientView
            ? `Dr. ${item.doctorId.userId.name} · ${item.doctorId.specialization}`
            : `Patient: ${item.patientId.name}`}
        </Text>

        <View style={styles.dateRow}>
          <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={theme.textTertiary} size={13} />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>{displayDate}</Text>
        </View>

        {item.prescription && (
          <View style={[styles.prescriptionContainer, { borderTopColor: theme.divider }]}>
            <Text style={[styles.prescriptionLabel, { color: theme.textTertiary }]}>Prescription</Text>
            <Text style={[styles.prescriptionText, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.prescription}
            </Text>
          </View>
        )}

        {item.labReportUrl && (
          <View style={[styles.attachmentTag, { backgroundColor: theme.infoBg }]}>
            <SymbolView name={{ ios: 'paperclip', android: 'attach_file', web: 'attach_file' }} tintColor={theme.info} size={14} />
            <Text style={[styles.attachmentText, { color: theme.info }]}>Lab Report</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          {user?.role === 'doctor' ? 'Patient Logs' : 'Medical History'}
        </Text>
        {user?.role === 'doctor' ? (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/(doctor)/records/add-record')}
          >
            <Text style={styles.addButtonText}>+ Add Record</Text>
          </TouchableOpacity>
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
          <View style={styles.emptyContent}>
            <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} tintColor={theme.textTertiary} size={48} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {user?.role === 'doctor' ? 'No records created yet.' : 'No medical history found.'}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: spacing.md, gap: spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyContent: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  diagnosis: { fontSize: 16, fontWeight: '700', marginBottom: 4, lineHeight: 22 },
  subLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  dateText: { fontSize: 13 },
  prescriptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  prescriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prescriptionText: { fontSize: 14, lineHeight: 20 },
  attachmentTag: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  attachmentText: { fontSize: 12, fontWeight: '600' },
});
