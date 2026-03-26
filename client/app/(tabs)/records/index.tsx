import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { recordService } from '@/features/records/services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import { Config } from '@/shared/constants/Config';
import type { PopulatedMedicalRecord } from '@/shared/types';

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load records.';
      Alert.alert('Error', message);
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
    const supported = await Linking.canOpenURL(fullUrl);
    if (supported) {
      await Linking.openURL(fullUrl);
    } else {
      Alert.alert('Cannot Open File', 'No app available to open this file type.');
    }
  };

  const renderRecord = ({ item }: { item: PopulatedMedicalRecord }) => {
    const isPatientView = user?.role === 'patient';
    const displayDate = new Date(item.dateRecorded).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{displayDate}</Text>
        </View>

        {isPatientView ? (
          <Text style={styles.subLabel}>
            Dr. {item.doctorId.userId.name} · {item.doctorId.specialization}
          </Text>
        ) : (
          <Text style={styles.subLabel}>
            Patient: {item.patientId.name}
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.label}>Diagnosis</Text>
        <Text style={styles.value}>{item.diagnosis}</Text>

        {item.prescription ? (
          <>
            <Text style={styles.label}>Prescription</Text>
            <Text style={styles.value}>{item.prescription}</Text>
          </>
        ) : null}

        {item.labReportUrl ? (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => void openLabReport(item.labReportUrl!)}
          >
            <Text style={styles.reportButtonText}>View Lab Report</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {user?.role === 'doctor' ? 'Patient Logs' : 'Medical History'}
        </Text>
        {user?.role === 'doctor' ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/records/add-record')}
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
          <Text style={styles.emptyText}>
            {user?.role === 'doctor' ? 'No records created yet.' : 'No medical history found.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  reportButton: {
    marginTop: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});
