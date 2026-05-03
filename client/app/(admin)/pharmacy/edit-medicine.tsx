import React, { useEffect, useMemo, useState } from 'react';
import { ROLES } from '@/shared/constants/roles';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { MS_PER_DAY } from '@/shared/constants/Config';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { medicineService, UpdateMedicinePayload } from '@/features/pharmacy/services/medicine.service';
import type { Medicine } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { toFormDataFile } from '@/shared/utils/formData';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export default function EditMedicineScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId ?? '';
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [packagingImageUrl, setPackagingImageUrl] = useState<string>('');
  const [newImage, setNewImage] = useState<PickedImage | null>(null);

  const canSubmit = useMemo(
    () => user?.role === ROLES.ADMIN || user?.role === ROLES.PHARMACIST,
    [user?.role],
  );

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Medicine ID is required.');
      setLoading(false);
      return;
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      Alert.alert('Error', 'Invalid medicine ID format.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadMedicine = async () => {
      try {
        const medicine: Medicine = await medicineService.getMedicineById(id);
        if (cancelled) return;
        setName(medicine.name);
        setCategory(medicine.category);
        setPrice(String(medicine.price));
        setStockQuantity(String(medicine.stockQuantity));
        setExpiryDate(new Date(medicine.expiryDate));
        setPackagingImageUrl(medicine.packagingImageUrl ?? '');
      } catch (err) {
        if (cancelled) return;
        console.error('[EditMedicine] Failed to load medicine:', err);
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load medication.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMedicine();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const pickNewImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to capture packaging images.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const extension = asset.uri.split('.').pop() ?? 'jpg';
      setNewImage({
        uri: asset.uri,
        name: `packaging-${Date.now()}.${extension}`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery permission is required to select packaging images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const extension = asset.uri.split('.').pop() ?? 'jpg';
        setNewImage({
          uri: asset.uri,
          name: `packaging-${Date.now()}.${extension}`,
          type: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open image gallery.');
    }
  };

  const validate = (): string | null => {
    if (!canSubmit) return 'You are not allowed to edit medications.';
    if (!name.trim()) return 'Medicine name is required.';
    if (!category.trim()) return 'Category is required.';

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return 'Price must be a non-negative number.';

    const parsedStock = Number(stockQuantity);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return 'Stock quantity must be a non-negative integer.';
    }

    if (expiryDate <= new Date()) return 'Expiry date must be in the future.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    if (!id) return;

    try {
      setSubmitting(true);

      const payload: UpdateMedicinePayload = {
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        stockQuantity: Number(stockQuantity),
        expiryDate: expiryDate.toISOString(),
      };

      if (newImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined) formData.append(key, String(value));
        });
        const file = toFormDataFile({
          uri: newImage.uri,
          name: newImage.name,
          mimeType: newImage.type,
        });

        formData.append('packagingImage', file!);

        await medicineService.updateMedicine(id, formData);
      } else {
        await medicineService.updateMedicine(id, payload as UpdateMedicinePayload);
      }

      Alert.alert('Success', 'Medication updated successfully.', [{ text: 'OK', onPress: () => router.replace('/(admin)/pharmacy') }]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update medication.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Edit Medication
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
            Update medicine details and inventory information.
          </Text>

          {/* Medicine Details Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.md,
              ...shadows.card,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: spacing.md,
              }}
            >
              MEDICINE DETAILS
            </Text>

            <Input
              label="Medicine Name"
              placeholder="e.g. Amoxicillin"
              value={name}
              onChangeText={setName}
              disabled={submitting}
            />

            <Input
              label="Category"
              placeholder="e.g. Antibiotic"
              value={category}
              onChangeText={setCategory}
              disabled={submitting}
            />

            <Input
              label="Price"
              placeholder="e.g. 12.5"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              disabled={submitting}
            />

            <Input
              label="Stock Quantity"
              placeholder="e.g. 100"
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="number-pad"
              disabled={submitting}
            />
          </View>

          {/* Expiry & Packaging Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.md,
              ...shadows.card,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: spacing.md,
              }}
            >
              EXPIRY & PACKAGING
            </Text>

            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: colors.textSecondary,
                  marginBottom: spacing.sm,
                }}
              >
                Expiry Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                disabled={submitting}
                activeOpacity={0.7}
                style={{
                  borderWidth: 1.5,
                  borderColor: colors.inputBorder,
                  borderRadius: radius.md,
                  backgroundColor: submitting ? colors.inputDisabled : colors.inputBackground,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 12,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.inputText, fontSize: 16 }}>
                  {expiryDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date(Date.now() + MS_PER_DAY)}
                onChange={onDateChange}
              />
            ) : null}

            <View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: colors.textSecondary,
                  marginBottom: spacing.sm,
                }}
              >
                Packaging Image
              </Text>
              {packagingImageUrl && !newImage ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                    gap: 12,
                  }}
                >
                  <Image
                    source={{ uri: getImageUrl(packagingImageUrl) }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: radius.xs,
                      backgroundColor: colors.border,
                    }}
                    resizeMode="cover"
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                    Current image &mdash; tap below to replace
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={pickNewImage}
                  disabled={submitting}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    backgroundColor: colors.primaryMuted,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    Camera
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickFromGallery}
                  disabled={submitting}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.primary,
                    borderRadius: radius.md,
                    backgroundColor: colors.primaryMuted,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="images-outline" size={20} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4 }}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {newImage ? (
              <View style={{ alignItems: 'center', marginTop: spacing.md }}>
                <Image
                  source={{ uri: newImage.uri }}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: radius.sm,
                    backgroundColor: colors.border,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm }}>
                  {newImage.name}
                </Text>
              </View>
            ) : null}
          </View>

          <Button
            title="Update Medication"
            variant="accent"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSubmit}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
