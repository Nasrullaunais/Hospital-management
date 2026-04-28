import React, { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors from '@/constants/Colors';
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
    if (!canSubmit) return 'You are not allowed to add medications.';
    if (!name.trim()) return 'Medicine name is required.';
    if (!category.trim()) return 'Category is required.';

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return 'Price must be a non-negative number.';

    const parsedStock = Number(stockQuantity);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return 'Stock quantity must be a non-negative integer.';
    }

    if (expiryDate <= new Date()) return 'Expiry date must be in the future.';
    if (!packagingImage) return 'Packaging image is required.';
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
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('price', String(Number(price)));
      formData.append('stockQuantity', String(Number(stockQuantity)));
      formData.append('expiryDate', expiryDate.toISOString());
      formData.append('packagingImage', {
        uri: packagingImage!.uri,
        name: packagingImage!.name,
        type: packagingImage!.type,
      } as PackagingImage);

      await medicineService.createMedicine(formData);
      Alert.alert('Success', 'Medication added successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add medication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>

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
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Save Medication</Text>}
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
