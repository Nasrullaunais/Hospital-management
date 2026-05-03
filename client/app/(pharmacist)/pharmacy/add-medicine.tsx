import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import { type CreateMedicinePayload, type UpdateMedicinePayload } from '@/features/pharmacy/services/medicine.service';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import Colors from '@/constants/Colors';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { useColorScheme } from '@/components/useColorScheme';
import { Input } from '@/components/ui/Input';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';

interface PackagingImage {
  uri: string;
  name: string;
  type: string;
}

export default function AddMedicineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(editId) && /^[0-9a-fA-F]{24}$/.test(editId ?? '');
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + ONE_DAY_MS));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [packagingImage, setPackagingImage] = useState<PackagingImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [existingImageUrl, setExistingImageUrl] = useState('');

  useEffect(() => {
    if (!isEditing || !editId) return;
    let cancelled = false;
    (async () => {
      try {
        const medicine = await medicineService.getMedicineById(editId);
        if (cancelled) return;
        setName(medicine.name);
        setCategory(medicine.category);
        setPrice(String(medicine.price));
        setStockQuantity(String(medicine.stockQuantity));
        setExpiryDate(new Date(medicine.expiryDate));
        setExistingImageUrl(medicine.packagingImageUrl ?? '');
      } catch (err) {
        if (cancelled) return;
        Alert.alert('Error', 'Failed to load medication details.');
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, isEditing]);

  const uploadImageToS3 = async (image: PackagingImage): Promise<string> => {
    // 1. Get presigned upload URL from backend
    const res = await apiClient.post(ENDPOINTS.FILES.UPLOAD_URL, {
      fileName: image.name,
      mimeType: image.type,
      module: 'pharmacy',
    });
    const { uploadUrl, fileKey } = res.data.data as { uploadUrl: string; fileKey: string };

    // 2. Read local file and upload directly to S3
    const fileResponse = await fetch(image.uri);
    const blob = await fileResponse.blob();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': image.type },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image (status ${uploadResponse.status})`);
    }

    return fileKey;
  };

  const canSubmit = useMemo(
    () => user?.role === 'admin' || user?.role === 'pharmacist',
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
      if (!permission.canAskAgain) {
        Alert.alert(
          'Permission Denied',
          'Camera permission has been permanently denied. Please enable camera access in your device settings to capture packaging photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to capture packaging images. Please grant camera access.',
        );
      }
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

  const validate = (): string | null => {
    if (!canSubmit) return isEditing ? 'You are not allowed to edit medications.' : 'You are not allowed to add medications.';
    if (!name.trim()) return 'Medicine name is required.';
    if (!category.trim()) return 'Category is required.';

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return 'Price must be a non-negative number.';

    const parsedStock = Number(stockQuantity);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return 'Stock quantity must be a non-negative integer.';
    }

    if (expiryDate <= new Date()) return 'Expiry date must be in the future.';
    if (!isEditing && !packagingImage) return 'Packaging image is required.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      setSubmitting(true);

      // Upload image to S3 if a new image was picked
      let fileKey: string | undefined;
      if (packagingImage) {
        fileKey = await uploadImageToS3(packagingImage);
      }

      if (isEditing && editId) {
        const payload: UpdateMedicinePayload = {
          name: name.trim(),
          category: category.trim(),
          price: Number(price),
          stockQuantity: Number(stockQuantity),
          expiryDate: expiryDate.toISOString(),
        };
        if (fileKey) payload.fileKey = fileKey;

        await medicineService.updateMedicine(editId, payload as UpdateMedicinePayload);

        Alert.alert('Success', 'Medication updated successfully.', [
          { text: 'OK', onPress: () => router.replace(`/(pharmacist)/pharmacy/${editId}`) },
        ]);
      } else {
        const payload: CreateMedicinePayload = {
          name: name.trim(),
          category: category.trim(),
          price: Number(price),
          stockQuantity: Number(stockQuantity),
          expiryDate: expiryDate.toISOString(),
        };
        if (fileKey) payload.fileKey = fileKey;

        await medicineService.createMedicine(payload);

        Alert.alert('Success', 'Medication added successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'add'} medication.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>

          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
            {isEditing ? 'Edit Medication' : 'Add New Medication'}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: spacing.md }}>
            {isEditing
              ? 'Update medicine details and inventory information.'
              : 'Add a new medicine to the pharmacy inventory.'}
          </Text>

          <View style={[styles.formCard, { backgroundColor: theme.surface, ...shadows.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MEDICATION DETAILS</Text>
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
              label="Price ($)"
              placeholder="e.g. 12.50"
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

          <View style={[styles.formCard, { backgroundColor: theme.surface, ...shadows.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>EXPIRY DATE</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              disabled={submitting}
            >
              <Text style={[styles.dateButtonText, { color: theme.text }]}>{expiryDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            {showDatePicker ? (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date(Date.now() + ONE_DAY_MS)}
                onChange={onDateChange}
              />
            ) : null}
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.surface, ...shadows.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PACKAGING IMAGE</Text>
            {isEditing && existingImageUrl && !packagingImage ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: 12 }}>
                <Image
                  source={{ uri: getImageUrl(existingImageUrl) }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: radius.xs,
                    backgroundColor: theme.border,
                  }}
                  resizeMode="cover"
                />
                <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }}>
                  Current image — tap below to replace
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.sm }}>
              <TouchableOpacity
                onPress={pickPackagingImage}
                style={[styles.imageButton, { borderColor: theme.primary, backgroundColor: theme.primaryMuted, flex: 1 }]}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={20} color={theme.primary} />
                <Text style={[styles.imageButtonText, { color: theme.primary }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickFromGallery}
                style={[styles.imageButton, { borderColor: theme.primary, backgroundColor: theme.primaryMuted, flex: 1 }]}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Ionicons name="images-outline" size={20} color={theme.primary} />
                <Text style={[styles.imageButtonText, { color: theme.primary }]}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {packagingImage ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: packagingImage.uri }} style={styles.previewImage} />
                <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>{packagingImage.name}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.accent }, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{isEditing ? 'Update Medication' : 'Save Medication'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  formCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  dateButtonText: { fontSize: typography.md },
  imageButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  imageButtonText: { fontSize: typography.sm, fontWeight: '600' },
  previewWrap: { marginTop: spacing.md, alignItems: 'center' },
  previewImage: { width: 160, height: 160, borderRadius: radius.sm, backgroundColor: '#e5e7eb' },
  previewLabel: { marginTop: spacing.sm, fontSize: typography.xs },
  submitButton: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
