import React, { useMemo, useState } from 'react';
import { ROLES } from '@/shared/constants/roles';
import {
  View,
  Text,
  TouchableOpacity,
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
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { MS_PER_DAY } from '@/shared/constants/Config';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import { toFormDataFile } from '@/shared/utils/formData';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export default function AddMedicineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + MS_PER_DAY));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [packagingImage, setPackagingImage] = useState<PickedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canSubmit = useMemo(
    () => user?.role === ROLES.ADMIN || user?.role === ROLES.PHARMACIST,
    [user?.role],
  );

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const pickPackagingImage = async () => {
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
      setPackagingImage({
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
        setPackagingImage({
          uri: asset.uri,
          name: `packaging-${Date.now()}.${extension}`,
          type: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open image gallery.');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!canSubmit) {
      newErrors.general = 'You are not allowed to add medications.';
    }
    if (!name.trim()) newErrors.name = 'Medicine name is required.';
    if (!category.trim()) newErrors.category = 'Category is required.';

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) newErrors.price = 'Price must be a non-negative number.';

    const parsedStock = Number(stockQuantity);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      newErrors.stockQuantity = 'Stock quantity must be a non-negative integer.';
    }

    if (expiryDate <= new Date()) newErrors.expiryDate = 'Expiry date must be in the future.';
    if (!packagingImage) newErrors.packagingImage = 'Packaging image is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('price', String(Number(price)));
      formData.append('stockQuantity', String(Number(stockQuantity)));
      formData.append('expiryDate', expiryDate.toISOString());
      const file = toFormDataFile({
        uri: packagingImage!.uri,
        name: packagingImage!.name,
        mimeType: packagingImage!.type,
      });

      formData.append('packagingImage', file!);

      await medicineService.createMedicine(formData);
      Alert.alert('Success', 'Medication added successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add medication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Add Medication
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
            Capture packaging and register medicine inventory.
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
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              error={errors.name || undefined}
              disabled={submitting}
            />

            <Input
              label="Category"
              placeholder="e.g. Antibiotic"
              value={category}
              onChangeText={(text) => {
                setCategory(text);
                if (errors.category) setErrors((prev) => ({ ...prev, category: '' }));
              }}
              error={errors.category || undefined}
              disabled={submitting}
            />

            <Input
              label="Price"
              placeholder="e.g. 12.5"
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                if (errors.price) setErrors((prev) => ({ ...prev, price: '' }));
              }}
              error={errors.price || undefined}
              keyboardType="decimal-pad"
              disabled={submitting}
            />

            <Input
              label="Stock Quantity"
              placeholder="e.g. 100"
              value={stockQuantity}
              onChangeText={(text) => {
                setStockQuantity(text);
                if (errors.stockQuantity) setErrors((prev) => ({ ...prev, stockQuantity: '' }));
              }}
              error={errors.stockQuantity || undefined}
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
              {errors.expiryDate && (
                <Text style={{ color: colors.inputError, fontSize: 12, marginTop: spacing.xs }}>
                  {errors.expiryDate}
                </Text>
              )}
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
                Packaging Image
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={pickPackagingImage}
                  disabled={submitting}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: errors.packagingImage ? colors.inputErrorBorder : colors.primary,
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
                    borderColor: errors.packagingImage ? colors.inputErrorBorder : colors.primary,
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
              {errors.packagingImage && (
                <Text style={{ color: colors.inputError, fontSize: 12, marginTop: spacing.xs }}>
                  {errors.packagingImage}
                </Text>
              )}
            </View>

            {packagingImage ? (
              <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                <Image
                  source={{ uri: packagingImage.uri }}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: radius.sm,
                    backgroundColor: colors.border,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm }}>
                  {packagingImage.name}
                </Text>
              </View>
            ) : null}
          </View>

          <Button
            title="Save Medication"
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
