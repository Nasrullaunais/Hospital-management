import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { appointmentService } from '@/features/appointments/services/appointment.service';
import type { ApiSuccessResponse, Appointment, User, AppointmentStatus } from '@/shared/types';
import { ListCard, EmptyState, LoadingState, ErrorState } from '@/components/ui';

const STATUS_VARIANTS = {
  Pending: 'warning' as const,
  Confirmed: 'info' as const,
  Completed: 'success' as const,
  Cancelled: 'error' as const,
};

const STATUS_OPTIONS: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

export default function DoctorScheduleScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const fetchSchedule = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[]; count: number }>>(
        ENDPOINTS.APPOINTMENTS.MY_DOCTOR_SCHEDULE,
      );
      setAppointments(res.data.data.appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your schedule.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSchedule().finally(() => setLoading(false));
  }, [fetchSchedule]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Appointment }) => {
    const patientName = typeof item.patientId === 'object'
      ? (item.patientId as User).name
      : 'Unknown Patient';

    const statusVariant = STATUS_VARIANTS[item.status] ?? 'neutral';

    return (
      <TouchableOpacity onPress={() => { setSelectedAppt(item); setModalOpen(true); }}>
        <ListCard
          title={patientName}
          subtitle={new Date(item.appointmentDate).toLocaleString()}
          badge={{ label: item.status, variant: statusVariant }}
          leftContent={
            <SymbolView
              name={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }}
              tintColor={colors.textTertiary}
              size={32}
            />
          }
          footer={
            item.reasonForVisit ? (
              <View style={styles.reasonRow}>
                <SymbolView
                  name={{ ios: 'text.alignleft', android: 'notes', web: 'notes' }}
                  tintColor={colors.textTertiary}
                  size={14}
                />
                <Text
                  style={[styles.reasonText, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {item.reasonForVisit}
                </Text>
              </View>
            ) : undefined
          }
        />
      </TouchableOpacity>
    );
  };

  if (loading && appointments.length === 0) {
    return <LoadingState message="Loading your schedule..." />;
  }

  if (error && appointments.length === 0) {
    return <ErrorState message={error} onRetry={fetchSchedule} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Schedule</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No Appointments"
            message="You don't have any appointments scheduled yet."
            icon="calendar.badge.exclamationmark"
          />
        }
      />

      {/* Status Update Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Update Status</Text>
            {selectedAppt && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalPatient, { color: colors.text }]}>
                    {typeof selectedAppt.patientId === 'object'
                      ? (selectedAppt.patientId as User).name
                      : 'Unknown Patient'}
                  </Text>
                  <Text style={[styles.modalDate, { color: colors.textSecondary }]}>
                    {new Date(selectedAppt.appointmentDate).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statusPicker}>
                  {STATUS_OPTIONS.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: selectedAppt.status === status ? colors.primaryMuted : colors.surface,
                          borderColor: selectedAppt.status === status ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setSelectedAppt(prev => prev ? { ...prev, status } : null);
                      }}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          { color: selectedAppt.status === status ? colors.primary : colors.text },
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                    onPress={() => { setModalOpen(false); setSelectedAppt(null); }}
                  >
                    <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalConfirmBtn,
                      { backgroundColor: colors.primary },
                      updating && styles.modalConfirmBtnDisabled,
                    ]}
                    onPress={async () => {
                      if (!selectedAppt || selectedAppt.status === appointments.find(a => a._id === selectedAppt._id)?.status) {
                        setModalOpen(false);
                        return;
                      }
                      setUpdating(true);
                      try {
                        await appointmentService.updateAppointmentStatus(selectedAppt._id, { status: selectedAppt.status });
                        setModalOpen(false);
                        await fetchSchedule();
                      } catch (err) {
                        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status');
                      } finally {
                        setUpdating(false);
                        setSelectedAppt(null);
                      }
                    }}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Update</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContainer: { padding: 12 },
  emptyContainer: { flex: 1 },
  header: {
    marginBottom: 12,
    paddingTop: 4,
    gap: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 2,
  },
  reasonText: { fontSize: 13, flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalInfo: { marginBottom: 16 },
  modalPatient: { fontSize: 18, fontWeight: '600' },
  modalDate: { fontSize: 14, marginTop: 4 },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusOptionText: { fontSize: 14, fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: { opacity: 0.6 },
});
