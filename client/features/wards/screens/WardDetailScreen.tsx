import React, { useEffect, useState, useMemo } from 'react';
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
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { wardService } from '../services/ward.service';
import type { Ward } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

export default function WardDetailScreen() {
  const { id: wardId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const c = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);

  const [ward, setWard] = useState<Ward | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error || !ward) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Feather name="alert-circle" size={48} color={c.error} />
        <Text style={[styles.errorText, { color: c.error }]}>{error ?? 'Ward not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';
  const wardLocation = ward.location || 'No location';
  const occupancyPercent = Math.round((ward.currentOccupancy / ward.totalBeds) * 100);
  const initial = ward.name ? ward.name.charAt(0).toUpperCase() : 'W';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return c.success;
      case 'full': return c.error;
      case 'maintenance': return '#D97706';
      default: return c.textTertiary;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: c.accent }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={[styles.name, { color: c.text }]}>{ward.name}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{wardLocation}</Text>
        <View style={styles.roleRow}>
          <View style={[styles.roleBadge, { backgroundColor: c.primaryMuted }]}>
            <Text style={[styles.roleBadgeText, { color: c.primary }]}>
              {ward.type.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(ward.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(ward.status) }]}>
            {ward.status}
          </Text>
        </View>
      </View>

      <View style={[styles.card, shadows.card, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Bed Availability</Text>
        <View style={styles.bedsContainer}>
          <View style={styles.bedsInfo}>
            <Text style={[styles.bedsValue, { color: c.text }]}>{ward.currentOccupancy}</Text>
            <Text style={[styles.bedsLabel, { color: c.textTertiary }]}>Occupied</Text>
          </View>
          <View style={[styles.bedsDivider, { backgroundColor: c.divider }]} />
          <View style={styles.bedsInfo}>
            <Text style={[styles.bedsValue, { color: c.success }]}>
              {ward.totalBeds - ward.currentOccupancy}
            </Text>
            <Text style={[styles.bedsLabel, { color: c.textTertiary }]}>Available</Text>
          </View>
          <View style={[styles.bedsDivider, { backgroundColor: c.divider }]} />
          <View style={styles.bedsInfo}>
            <Text style={[styles.bedsValue, { color: c.text }]}>{ward.totalBeds}</Text>
            <Text style={[styles.bedsLabel, { color: c.textTertiary }]}>Total</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { backgroundColor: c.surfaceSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${occupancyPercent}%`,
                  backgroundColor: occupancyPercent >= 100 ? '#ef4444' : '#22c55e',
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: c.textTertiary }]}>
            {occupancyPercent}% occupied
          </Text>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.adminSection}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.primary }]}
            onPress={() => Alert.alert(
              'Edit Ward',
              'Edit functionality will be available in a future update.',
            )}
          >
            <Feather name="edit-2" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.actionButtonText}>Edit Ward</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.primary }]}
            onPress={openBedUpdateModal}
          >
            <Feather name="thermometer" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.actionButtonText}>Update Bed Occupancy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.error }]}
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
            <Feather name="trash-2" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.actionButtonText}>Delete Ward</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlay }]} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalContent, shadows.modal, { backgroundColor: c.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: c.text }]}>Update Bed Occupancy</Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>
              Enter new bed occupancy (0 - {ward.totalBeds}):
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: c.inputBackground, borderColor: bedInputError ? c.inputErrorBorder : c.inputBorder, color: c.inputText },
                bedInputError ? { borderColor: c.inputErrorBorder } : null,
              ]}
              value={bedInput}
              onChangeText={(text) => {
                setBedInput(text);
                setBedInputError(null);
              }}
              keyboardType="number-pad"
              placeholder="Enter bed count"
              placeholderTextColor={c.inputPlaceholder}
              autoFocus
            />
            {bedInputError && (
              <Text style={[styles.errorTextModal, { color: c.error }]}>{bedInputError}</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.surfaceSecondary }]}
                onPress={() => setModalVisible(false)}
                disabled={updatingBeds}
              >
                <Text style={[styles.modalButtonCancelText, { color: c.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.primary }]}
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
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: typography.md, marginTop: spacing.sm },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: typography.bold, color: '#FFFFFF' },
  name: { fontSize: typography.xxl, fontWeight: typography.bold, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.sm, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roleBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: typography.xs, fontWeight: typography.medium },

  // Detail Card
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  // Bed Stats
  bedsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  bedsInfo: { alignItems: 'center' },
  bedsValue: { fontSize: typography.xxl, fontWeight: typography.bold },
  bedsLabel: { fontSize: typography.xs, marginTop: spacing.xs },
  bedsDivider: { width: 1, alignSelf: 'stretch' },
  progressBarContainer: { alignItems: 'center' },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.xs },
  progressText: { fontSize: typography.xs, marginTop: spacing.sm },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  adminSection: { gap: spacing.sm, marginTop: spacing.xs },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: typography.sm,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.md,
  },
  errorTextModal: {
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  modalButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
  },
  modalButtonCancelText: {
    fontWeight: typography.semibold,
  },
  modalButtonUpdateText: {
    color: '#fff',
    fontWeight: typography.semibold,
  },
});
