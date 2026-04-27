import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
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

  useEffect(() => {
    if (!id) return;

    medicineService.getMedicineById(id)
      .then(setMedicine)
      .catch(() => setError('Failed to load medicine details'))
      .finally(() => setLoading(false));
  }, [id]);

  const isExpiringSoon = (dateStr: string) => {
    const daysUntil = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= EXPIRY_WARNING_DAYS;
  };

  const isLowStock = (qty: number) => qty < LOW_STOCK_THRESHOLD;

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
        {/* Image */}
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

        {/* Status Badges */}
        <View style={styles.badgeRow}>
          {lowStock && (
            <View style={[styles.badge, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
              <Text style={[styles.badgeText, { color: theme.error }]}>Low Stock</Text>
            </View>
          )}
          {expiringSoon && (
            <View style={[styles.badge, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
              <Text style={[styles.badgeText, { color: theme.warning }]}>Expiring Soon</Text>
            </View>
          )}
          {!lowStock && !expiringSoon && (
            <View style={[styles.badge, { backgroundColor: theme.successBg, borderColor: theme.success }]}>
              <Text style={[styles.badgeText, { color: theme.success }]}>In Stock</Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.name, { color: theme.text }]}>{medicine.name}</Text>
          <Text style={[styles.category, { color: theme.textSecondary }]}>{medicine.category}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Price</Text>
              <Text style={[styles.infoValue, { color: theme.success }]}>${medicine.price.toFixed(2)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Stock</Text>
              <Text style={[styles.infoValue, { color: lowStock ? theme.error : theme.text }]}>
                {medicine.stockQuantity} units
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Expiry Date</Text>
              <Text style={[styles.infoValue, { color: expiringSoon ? theme.warning : theme.text }]}>
                {new Date(medicine.expiryDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Added</Text>
              <Text style={[styles.infoValue, { color: theme.textSecondary }]}>
                {medicine.createdAt ? new Date(medicine.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Expiry Warning */}
        {expiringSoon && (
          <View style={[styles.warningCard, { backgroundColor: theme.warningBg, borderColor: theme.warning }]}>
            <Feather name="alert-triangle" size={20} color={theme.warning} />
            <Text style={[styles.warningText, { color: theme.warning }]}>
              This medicine expires within 60 days. Consider using FEFO (First Expired, First Out).
            </Text>
          </View>
        )}

        {/* Low Stock Warning */}
        {lowStock && (
          <View style={[styles.warningCard, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
            <Feather name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.warningText, { color: theme.error }]}>
              Stock is below reorder level. Please restock soon.
            </Text>
          </View>
        )}
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
    height: 240,
    marginBottom: spacing.md,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: spacing.sm, fontSize: 14 },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, ...shadows.card },
  name: { fontSize: 24, fontWeight: '700', marginBottom: spacing.xs },
  category: { fontSize: 14, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: spacing.md },
  infoRow: { flexDirection: 'row' },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: spacing.xs },
  infoValue: { fontSize: 16, fontWeight: '600' },
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
  errorText: { marginTop: spacing.sm },
  retryButton: { marginTop: spacing.md, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  retryButtonText: { color: '#fff', fontWeight: '600' },
});
