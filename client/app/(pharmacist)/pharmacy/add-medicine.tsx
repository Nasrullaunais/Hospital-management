import React, { useMemo, useState } from 'react';
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import Colors, { gray } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

// Destructure for convenience - useMemo ensures stable reference
const useColors = (colorScheme: 'light' | 'dark' | null) => useMemo(() => {
  const c = Colors[colorScheme ?? 'light'];
  return {
    gray50: gray[50],
    gray100: gray[100],
    gray200: gray[200],
    gray300: gray[300],
    gray400: gray[400],
    gray500: gray[500],
    gray600: gray[600],
    gray700: gray[700],
    gray800: gray[800],
    gray900: gray[900],
    text: c.text,
    textMuted: c.textSecondary,
    textSecondary: c.textSecondary,
    surface: c.surface,
    primary: c.primary,
    success: c.success,
    successBg: c.successBg,
    error: c.error,
    errorBg: c.errorBg,
    infoBg: c.infoBg,
  };
}, [colorScheme]);

export default function AddMedicineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const c = useColors(colorScheme);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [packagingImage, setPackagingImage] = useState<PickedImage | null>(null);
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
      } as unknown as Blob);

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
        <ScrollView style={[styles.container, { backgroundColor: c.gray50 }]} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.gray900 }]}>Add Medication</Text>
        <Text style={[styles.subtitle, { color: c.gray500 }]}>Capture packaging and register medicine inventory.</Text>

        <Text style={[styles.label, { color: c.gray700 }]}>Medicine Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.gray300, color: c.text }]}
          placeholder="e.g. Amoxicillin"
          placeholderTextColor={c.textMuted}
          editable={!submitting}
        />

        <Text style={[styles.label, { color: c.gray700 }]}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.gray300, color: c.text }]}
          placeholder="e.g. Antibiotic"
          placeholderTextColor={c.textMuted}
          editable={!submitting}
        />

        <Text style={[styles.label, { color: c.gray700 }]}>Price ($)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.gray300, color: c.text }]}
          placeholder="e.g. 12.50"
          placeholderTextColor={c.textMuted}
          keyboardType="decimal-pad"
          editable={!submitting}
        />

        <Text style={[styles.label, { color: c.gray700 }]}>Stock Quantity</Text>
        <TextInput
          value={stockQuantity}
          onChangeText={setStockQuantity}
          style={[styles.input, { backgroundColor: c.surface, borderColor: c.gray300, color: c.text }]}
          placeholder="e.g. 100"
          placeholderTextColor={c.textMuted}
          keyboardType="number-pad"
          editable={!submitting}
        />

        <Text style={[styles.label, { color: c.gray700 }]}>Expiry Date</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.dateButton, { backgroundColor: c.surface, borderColor: c.gray300 }]}
          disabled={submitting}
        >
          <Text style={[styles.dateButtonText, { color: c.text }]}>{expiryDate.toLocaleDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker ? (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
            onChange={onDateChange}
          />
        ) : null}

        <Text style={[styles.label, { color: c.gray700 }]}>Packaging Image</Text>
        <TouchableOpacity
          onPress={pickPackagingImage}
          style={[styles.imageButton, { borderColor: c.primary }]}
          disabled={submitting}
        >
          <Text style={[styles.imageButtonText, { color: c.primary }]}>
            {packagingImage ? 'Retake Packaging Photo' : 'Capture Packaging Photo'}
          </Text>
        </TouchableOpacity>

        {packagingImage ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: packagingImage.uri }} style={styles.previewImage} />
            <Text style={[styles.previewLabel, { color: c.gray500 }]}>{packagingImage.name}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: c.primary }, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Medication</Text>}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  label: { marginBottom: 6, marginTop: 8, fontWeight: '600', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: { fontSize: 14 },
  imageButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.light.infoBg,
  },
  imageButtonText: { fontSize: 14, fontWeight: '600' },
  previewWrap: { marginTop: 10, alignItems: 'center' },
  previewImage: { width: 160, height: 160, borderRadius: 10, backgroundColor: gray[200] },
  previewLabel: { marginTop: 8, fontSize: 12 },
  submitButton: {
    marginTop: 24,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});