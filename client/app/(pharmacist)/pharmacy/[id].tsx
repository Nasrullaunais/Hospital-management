import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import type { Medicine } from '@/shared/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Badge } from '@/components/ui';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS } from '@/shared/constants/pharmacy';
import { getImageUrl } from '@/shared/utils/getImageUrl';

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    medicineService.getMedicineById(id)
      .then(setMedicine)
      .catch(() => setError('Failed to load medicine details'))
      .finally(() => setLoading(false));
  }, [id]);

  const isExpiringSoon = useCallback((dateStr: string) => {
    const daysUntil = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= EXPIRY_WARNING_DAYS;
  }, []);

  const isLowStock = useCallback((qty: number) => qty < LOW_STOCK_THRESHOLD, []);

  const handleDelete = useCallback(() => {
    if (!medicine) return;
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicine.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await medicineService.deleteMedicine(id);
              router.back();
            } catch (err) {
              console.error('[MedicineDetail] delete error:', err);
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete medicine. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [medicine, router, id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !medicine) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error || 'Medicine not found'}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const lowStock = isLowStock(medicine.stockQuantity);
  const expiringSoon = isExpiringSoon(medicine.expiryDate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.imageContainer, { backgroundColor: theme.surfaceTertiary }]}>
          {medicine.packagingImageUrl ? (
            <Image
              source={{ uri: getImageUrl(medicine.packagingImageUrl) }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="package" size={48} color={theme.textTertiary} />
              <Text style={[styles.placeholderText, { color: theme.textTertiary }]}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.badgeRow}>
          {lowStock ? (
            <Badge label="Low Stock" variant="error" size="md" />
          ) : expiringSoon ? (
            <Badge label="Expiring Soon" variant="warning" size="md" />
          ) : (
            <Badge label="In Stock" variant="success" size="md" />
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, ...shadows.card }]}>
          <Text style={[styles.name, { color: theme.text }]}>{medicine.name}</Text>
          <Text style={[styles.category, { color: theme.textSecondary }]}>{medicine.category}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>PRICE</Text>
              <Text style={[styles.infoValue, { color: theme.success }]}>${medicine.price.toFixed(2)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>STOCK</Text>
              <Text style={[styles.infoValue, { color: lowStock ? theme.error : theme.text }]}>
                {medicine.stockQuantity} units
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>EXPIRY DATE</Text>
              <Text style={[styles.infoValue, { color: expiringSoon ? theme.warning : theme.text }]}>
                {new Date(medicine.expiryDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>ADDED</Text>
              <Text style={[styles.infoValue, { color: theme.textSecondary }]}>
                {medicine.createdAt ? new Date(medicine.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {expiringSoon && (
          <View style={[styles.warningCard, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
            <Feather name="alert-triangle" size={20} color={theme.warning} />
            <Text style={[styles.warningText, { color: theme.warning }]}>
              This medicine expires within 60 days. Consider using FEFO (First Expired, First Out).
            </Text>
          </View>
        )}

        {lowStock && (
          <View style={[styles.warningCard, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
            <Feather name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.warningText, { color: theme.error }]}>
              Stock is below reorder level. Please restock soon.
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.push(`/(pharmacist)/pharmacy/add-medicine`)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn, { backgroundColor: theme.error }, deleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            activeOpacity={0.7}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="trash-2" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.actionBtnText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  imageContainer: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 260,
    marginBottom: spacing.md,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: spacing.sm, fontSize: typography.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, ...shadows.card },
  name: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  category: { fontSize: typography.sm, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: spacing.md },
  infoRow: { flexDirection: 'row' },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: typography.xs, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: typography.md, fontWeight: '600' },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  warningText: { flex: 1, fontSize: 13, fontWeight: '500' },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  editBtn: {},
  deleteBtn: {},
  actionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  errorText: { marginTop: spacing.sm },
  retryButton: { marginTop: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryButtonText: { color: '#fff', fontWeight: '600' },
});
