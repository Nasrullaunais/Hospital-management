import React, { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { MS_PER_DAY } from '@/shared/constants/Config';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import { toFormDataFile } from '@/shared/utils/formData';

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
  inputError: {
    borderColor: Colors[colorScheme].error,
  },
  errorText: {
    color: Colors[colorScheme].error,
    fontSize: 12,
    marginTop: 4,
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
    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
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
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          style={[styles.input, errors.name && styles.inputError]}
          placeholder="e.g. Amoxicillin"
          editable={!submitting}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <Text style={styles.label}>Category</Text>
        <TextInput
          value={category}
          onChangeText={(text) => {
            setCategory(text);
            if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
          }}
          style={[styles.input, errors.category && styles.inputError]}
          placeholder="e.g. Antibiotic"
          editable={!submitting}
        />
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

        <Text style={styles.label}>Price</Text>
        <TextInput
          value={price}
          onChangeText={(text) => {
            setPrice(text);
            if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
          }}
          style={[styles.input, errors.price && styles.inputError]}
          placeholder="e.g. 12.5"
          keyboardType="decimal-pad"
          editable={!submitting}
        />
        {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}

        <Text style={styles.label}>Stock Quantity</Text>
        <TextInput
          value={stockQuantity}
          onChangeText={(text) => {
            setStockQuantity(text);
            if (errors.stockQuantity) setErrors((prev) => ({ ...prev, stockQuantity: undefined }));
          }}
          style={[styles.input, errors.stockQuantity && styles.inputError]}
          placeholder="e.g. 100"
          keyboardType="number-pad"
          editable={!submitting}
        />
        {errors.stockQuantity && <Text style={styles.errorText}>{errors.stockQuantity}</Text>}

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
        {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}

        <Text style={styles.label}>Packaging Image</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <TouchableOpacity
            onPress={pickPackagingImage}
            style={[styles.imageButton, errors.packagingImage && styles.inputError, { flex: 1 }]}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={20} color={Colors[colorScheme].primary} />
            <Text style={styles.imageButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickFromGallery}
            style={[styles.imageButton, errors.packagingImage && styles.inputError, { flex: 1 }]}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={20} color={Colors[colorScheme].primary} />
            <Text style={styles.imageButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
        {errors.packagingImage && <Text style={styles.errorText}>{errors.packagingImage}</Text>}

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
