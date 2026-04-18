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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { medicineService } from '@/features/pharmacy/services/medicine.service';

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  flex: { flex: 1 },
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
});

export default function AddMedicineScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add Medication</Text>
        <Text style={styles.subtitle}>Capture packaging and register medicine inventory.</Text>

        <Text style={styles.label}>Medicine Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g. Amoxicillin"
          editable={!submitting}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          placeholder="e.g. Antibiotic"
          editable={!submitting}
        />

        <Text style={styles.label}>Price</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          style={styles.input}
          placeholder="e.g. 12.5"
          keyboardType="decimal-pad"
          editable={!submitting}
        />

        <Text style={styles.label}>Stock Quantity</Text>
        <TextInput
          value={stockQuantity}
          onChangeText={setStockQuantity}
          style={styles.input}
          placeholder="e.g. 100"
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
            minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
            onChange={onDateChange}
          />
        ) : null}

        <Text style={styles.label}>Packaging Image</Text>
        <TouchableOpacity
          onPress={pickPackagingImage}
          style={styles.imageButton}
          disabled={submitting}
        >
          <Text style={styles.imageButtonText}>
            {packagingImage ? 'Retake Packaging Photo' : 'Capture Packaging Photo'}
          </Text>
        </TouchableOpacity>

        {packagingImage ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: packagingImage.uri }} style={styles.previewImage} />
            <Text style={styles.previewLabel}>{packagingImage.name}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitButton, submitting ? styles.submitButtonDisabled : undefined]}
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
