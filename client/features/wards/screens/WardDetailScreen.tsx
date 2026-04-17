import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { wardService } from '../services/ward.service';
import type { Ward } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

export default function WardDetailScreen() {
  const { id: wardId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [ward, setWard] = useState<Ward | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for bed occupancy update
  const [modalVisible, setModalVisible] = useState(false);
  const [bedInput, setBedInput] = useState('');
  const [bedInputError, setBedInputError] = useState<string | null>(null);
  const [updatingBeds, setUpdatingBeds] = useState(false);

  useEffect(() => {
    wardService
      .getWardById(wardId)
      .then(setWard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ward.'))
      .finally(() => setLoading(false));
  }, [wardId]);

  const openBedUpdateModal = () => {
    setBedInput(ward?.currentOccupancy.toString() ?? '');
    setBedInputError(null);
    setModalVisible(true);
  };

  const validateBedInput = (value: string): boolean => {
    const occupancy = parseInt(value, 10);
    if (isNaN(occupancy)) {
      setBedInputError('Please enter a valid number');
      return false;
    }
    if (occupancy < 0) {
      setBedInputError('Occupancy cannot be negative');
      return false;
    }
    if (ward && occupancy > ward.totalBeds) {
      setBedInputError(`Occupancy cannot exceed total beds (${ward.totalBeds})`);
      return false;
    }
    setBedInputError(null);
    return true;
  };

  const handleBedUpdate = async () => {
    if (!validateBedInput(bedInput) || !ward) return;

    setUpdatingBeds(true);
    try {
      const occupancy = parseInt(bedInput, 10);
      await wardService.updateBeds(ward._id, { currentOccupancy: occupancy });
      // Refresh ward data
      const updated = await wardService.getWardById(ward._id);
      setWard(updated);
      setModalVisible(false);
      Alert.alert('Success', 'Bed occupancy updated');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update beds.');
    } finally {
      setUpdatingBeds(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !ward) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Ward not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';
  const departmentName = typeof ward.departmentId === 'object' ? ward.departmentId.name : 'Unknown';
  const occupancyPercent = Math.round((ward.currentOccupancy / ward.totalBeds) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return styles.badgeGreen;
      case 'full': return styles.badgeRed;
      case 'maintenance': return styles.badgeYellow;
      default: return styles.badgeGray;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'available': return styles.badgeTextGreen;
      case 'full': return styles.badgeTextRed;
      case 'maintenance': return styles.badgeTextYellow;
      default: return styles.badgeTextGray;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{ward.name}</Text>
          <Text style={styles.departmentName}>{departmentName}</Text>
        </View>
        <View style={[styles.badge, getStatusColor(ward.status)]}>
          <Text style={[styles.badgeText, getStatusTextColor(ward.status)]}>
            {ward.status}
          </Text>
        </View>
      </View>

      <View style={styles.typeContainer}>
        <Text style={styles.typeLabel}>Type: </Text>
        <Text style={styles.typeValue}>{ward.type.toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bed Availability</Text>
        <View style={styles.bedsContainer}>
          <View style={styles.bedsInfo}>
            <Text style={styles.bedsValue}>{ward.currentOccupancy}</Text>
            <Text style={styles.bedsLabel}>Occupied</Text>
          </View>
          <View style={styles.bedsDivider} />
          <View style={styles.bedsInfo}>
            <Text style={styles.bedsValue}>{ward.totalBeds - ward.currentOccupancy}</Text>
            <Text style={styles.bedsLabel}>Available</Text>
          </View>
          <View style={styles.bedsDivider} />
          <View style={styles.bedsInfo}>
            <Text style={styles.bedsValue}>{ward.totalBeds}</Text>
            <Text style={styles.bedsLabel}>Total</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${occupancyPercent}%`, backgroundColor: occupancyPercent >= 100 ? '#ef4444' : '#22c55e' }]} />
          </View>
          <Text style={styles.progressText}>{occupancyPercent}% occupied</Text>
        </View>
      </View>

      {/* Admin actions */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>Admin Actions</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert(
              'Edit Ward',
              'Edit functionality will be available in a future update.',
            )}
          >
            <Text style={styles.editButtonText}>Edit Ward</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { marginTop: 8 }]}
            onPress={openBedUpdateModal}
          >
            <Text style={styles.editButtonText}>Update Bed Occupancy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { marginTop: 8, borderColor: '#ef4444' }]}
            onPress={() => {
              Alert.alert(
                'Delete Ward',
                `Are you sure you want to delete ${ward.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await wardService.deleteWard(ward._id);
                        Alert.alert('Deleted', 'Ward has been removed.');
                        router.back();
                      } catch (err) {
                        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete ward.');
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Text style={[styles.editButtonText, { color: '#ef4444' }]}>Delete Ward</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bed Update Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Update Bed Occupancy</Text>
            <Text style={styles.modalSubtitle}>Enter new bed occupancy (0 - {ward.totalBeds}):</Text>
            <TextInput
              style={[styles.modalInput, bedInputError ? styles.modalInputError : null]}
              value={bedInput}
              onChangeText={(text) => {
                setBedInput(text);
                setBedInputError(null);
              }}
              keyboardType="number-pad"
              placeholder="Enter bed count"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            {bedInputError && <Text style={styles.errorTextModal}>{bedInputError}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
                disabled={updatingBeds}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonUpdate]}
                onPress={handleBedUpdate}
                disabled={updatingBeds}
              >
                {updatingBeds ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonUpdateText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  name: { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  departmentName: { fontSize: 14, color: '#666' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfed6' },
  badgeRed: { backgroundColor: '#fee2e2' },
  badgeYellow: { backgroundColor: '#fef3c7' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextGreen: { color: '#166534' },
  badgeTextRed: { color: '#991b1b' },
  badgeTextYellow: { color: '#92400e' },
  badgeTextGray: { color: '#6b7280' },
  typeContainer: { flexDirection: 'row', marginBottom: 20 },
  typeLabel: { fontSize: 15, color: '#888' },
  typeValue: { fontSize: 15, fontWeight: '600', color: '#2563eb' },
  section: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16 },
  bedsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  bedsInfo: { alignItems: 'center' },
  bedsValue: { fontSize: 24, fontWeight: '700', color: '#1a1a2e' },
  bedsLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  bedsDivider: { width: 1, backgroundColor: '#e5e7eb' },
  progressBarContainer: { alignItems: 'center' },
  progressBar: { width: '100%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#888', marginTop: 8 },
  adminSection: { marginTop: 24, borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 16 },
  adminLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  editButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: { color: '#374151', fontWeight: '600' },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a2e',
    backgroundColor: '#f9fafb',
  },
  modalInputError: {
    borderColor: '#ef4444',
  },
  errorTextModal: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonCancelText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  modalButtonUpdate: {
    backgroundColor: '#2563eb',
  },
  modalButtonUpdateText: {
    color: '#fff',
    fontWeight: '600',
  },
});
