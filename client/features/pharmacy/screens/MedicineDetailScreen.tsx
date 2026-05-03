import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { medicineService } from '../services/medicine.service';
import { useAuth } from '@/shared/context/AuthContext';
import type { Medicine } from '@/shared/types';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS } from '@/shared/constants/pharmacy';
import { getImageUrl } from '@/shared/utils/getImageUrl';

interface Props {
  medicineId: string;
  onDeleted?: () => void;
}

/** MedicineDetailScreen — Full view of a single medicine item. */
export default function MedicineDetailScreen({ medicineId, onDeleted }: Props) {
  const { user } = useAuth();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    medicineService
      .getMedicineById(medicineId)
      .then(setMedicine)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load medicine.'))
      .finally(() => setLoading(false));
  }, [medicineId]);

  const handleDelete = () => {
    Alert.alert('Delete Medicine', 'Remove this medicine from the inventory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await medicineService.deleteMedicine(medicineId);
            onDeleted?.();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !medicine) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Medicine not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';
  const daysUntilExpiry =
    (new Date(medicine.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const expiringSoon = daysUntilExpiry <= EXPIRY_WARNING_DAYS;
  const isLowStock = medicine.stockQuantity < LOW_STOCK_THRESHOLD;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {medicine.packagingImageUrl && (
        <Image
          source={{ uri: getImageUrl(medicine.packagingImageUrl) }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      <Text style={styles.name}>{medicine.name}</Text>
      <Text style={styles.category}>{medicine.category}</Text>

      {expiringSoon && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ Expires in {Math.round(daysUntilExpiry)} days
          </Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <Stat label="Price" value={`$${medicine.price.toFixed(2)}`} color="#059669" />
        <Stat
          label="In Stock"
          value={`${medicine.stockQuantity} units`}
          color={isLowStock ? '#d97706' : '#374151'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Expiry Date</Text>
        <Text style={styles.sectionValue}>
          {new Date(medicine.expiryDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {isAdmin && (
        <View style={styles.adminRow}>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 200, borderRadius: 10, marginBottom: 16, backgroundColor: '#f3f4f6' },
  name: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  category: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  warningBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  warningText: { color: '#92400e', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '700' },
  section: {
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    paddingTop: 14,
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase' },
  sectionValue: { fontSize: 15, color: '#374151' },
  adminRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  editText: { fontWeight: '600', color: '#374151' },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  deleteText: { fontWeight: '600', color: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
