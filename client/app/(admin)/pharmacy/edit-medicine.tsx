import React, { useEffect, useMemo, useState } from 'react';
import { ROLES } from '@/shared/constants/roles';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
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
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { MS_PER_DAY } from '@/shared/constants/Config';
import { medicineService, UpdateMedicinePayload } from '@/features/pharmacy/services/medicine.service';
import type { Medicine } from '@/shared/types';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import { toFormDataFile } from '@/shared/utils/formData';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].surfaceTertiary,
  },
  content: {
    padding: 18,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors[colorScheme].text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors[colorScheme].textSecondary,
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    marginTop: 8,
    color: Colors[colorScheme].textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 8,
    backgroundColor: Colors[colorScheme].surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors[colorScheme].text,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: Colors[colorScheme].surfaceTertiary,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 8,
    backgroundColor: Colors[colorScheme].surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    color: Colors[colorScheme].text,
    fontSize: 14,
  },
  imageButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors[colorScheme].primary,
    borderRadius: 8,
    backgroundColor: Colors[colorScheme].infoBg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  imageButtonText: {
    color: Colors[colorScheme].primary,
    fontSize: 14,
    fontWeight: '600',
  },
  previewWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  previewImage: {
    width: 160,
    height: 160,
    borderRadius: 10,
    backgroundColor: Colors[colorScheme].border,
  },
  previewLabel: {
    marginTop: 8,
    color: Colors[colorScheme].textSecondary,
    fontSize: 12,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: Colors[colorScheme].primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  currentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors[colorScheme].border,
  },
});

export default function EditMedicineScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = rawId ?? '';
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: Colors[colorScheme].surfaceTertiary }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: Colors[colorScheme].surfaceTertiary }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Edit Medication</Text>
          <Text style={styles.subtitle}>Update medicine details and inventory information.</Text>

          <Text style={styles.label}>Medicine Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="e.g. Amoxicillin"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            editable={!submitting}
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            style={styles.input}
            placeholder="e.g. Antibiotic"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            editable={!submitting}
          />

          <Text style={styles.label}>Price</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            style={styles.input}
            placeholder="e.g. 12.5"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            keyboardType="decimal-pad"
            editable={!submitting}
          />

          <Text style={styles.label}>Stock Quantity</Text>
          <TextInput
            value={stockQuantity}
            onChangeText={setStockQuantity}
            style={styles.input}
            placeholder="e.g. 100"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            keyboardType="number-pad"
            editable={!submitting}
          />

          <Text style={styles.label}>Expiry Date</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            disabled={submitting}
          >
            <Text style={styles.dateButtonText}>{expiryDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker ? (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date(Date.now() + MS_PER_DAY)}
              onChange={onDateChange}
            />
          ) : null}

          <Text style={styles.label}>Packaging Image</Text>
          {packagingImageUrl && !newImage ? (
            <View style={styles.imagePreviewRow}>
              <Image
                source={{ uri: getImageUrl(packagingImageUrl) }}
                style={styles.currentImage}
                resizeMode="cover"
              />
              <Text style={{ color: Colors[colorScheme].textSecondary, fontSize: 12, flex: 1 }}>
                Current image — tap below to replace
              </Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <TouchableOpacity
              onPress={pickNewImage}
              style={[styles.imageButton, { flex: 1 }]}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color={Colors[colorScheme].primary} />
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromGallery}
              style={[styles.imageButton, { flex: 1 }]}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={20} color={Colors[colorScheme].primary} />
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {newImage ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: newImage.uri }} style={styles.previewImage} />
              <Text style={styles.previewLabel}>{newImage.name}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.submitButton, submitting ? styles.submitButtonDisabled : undefined]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Update Medication</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}