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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { recordService } from '@/features/records/services/record.service';
import { useAuth } from '@/shared/context/AuthContext';
import { Config } from '@/shared/constants/Config';
import type { PopulatedMedicalRecord } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

export default function RecordsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/(doctor)/records/${item._id}`)}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={styles.dateRow}>
              <SymbolView name={{ ios: 'calendar', android: 'event', web: 'event' }} tintColor={colors.textSecondary} size={13} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>{displayDate}</Text>
            </View>
          </View>

          {isPatientView ? (
            <View style={styles.subLabelRow}>
              <SymbolView name={{ ios: 'stethoscope', android: 'medical_services', web: 'medical_services' }} tintColor={colors.primary} size={16} />
              <Text style={[styles.subLabel, { color: colors.primary }]}>
                Dr. {item.doctorId.userId.name} · {item.doctorId.specialization}
              </Text>
            </View>
          ) : (
            <View style={styles.subLabelRow}>
              <SymbolView name={{ ios: 'person', android: 'person', web: 'person' }} tintColor={colors.primary} size={16} />
              <Text style={[styles.subLabel, { color: colors.primary }]}>
                {item.patientId.name}
              </Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <View style={styles.diagnosisSection}>
            <Text style={[styles.diagnosisLabel, { color: colors.textSecondary }]}>Diagnosis</Text>
            <Text style={[styles.diagnosisValue, { color: colors.text }]}>{item.diagnosis}</Text>
          </View>

          {item.prescription ? (
            <View style={styles.prescriptionSection}>
              <Text style={[styles.prescriptionLabel, { color: colors.textSecondary }]}>Prescription</Text>
              <Text style={[styles.prescriptionValue, { color: colors.text }]}>{item.prescription}</Text>
            </View>
          ) : null}

          {item.labReportUrl ? (
            <TouchableOpacity
              style={[styles.reportButton, { backgroundColor: colors.infoBg, borderColor: colors.info }]}
              onPress={() => void openLabReport(item.labReportUrl!)}
            >
              <SymbolView name={{ ios: 'doc.text', android: 'description', web: 'description' }} tintColor={colors.info} size={16} />
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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {user?.role === 'doctor' ? 'Patient Logs' : 'Medical History'}
        </Text>
        {user?.role === 'doctor' ? (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(doctor)/records/add-record')}
          >
            <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} tintColor="#fff" size={16} />
            <Text style={styles.addButtonText}>Add Record</Text>
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
          <View style={styles.emptyState}>
            <SymbolView
              name={{ ios: 'doc.text.magnifyingglass', android: 'search', web: 'search' }}
              tintColor={colors.textTertiary}
              size={48}
            />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingBottom: TAB_BAR_HEIGHT + 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingBottom: TAB_BAR_HEIGHT + 16,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 8,
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
  subLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  diagnosisSection: {
    marginBottom: 12,
  },
  diagnosisLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  diagnosisValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  prescriptionSection: {
    marginBottom: 12,
  },
  prescriptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prescriptionValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  reportButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
