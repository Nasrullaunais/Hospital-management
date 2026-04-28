import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { doctorService } from '@/features/doctors/services/doctor.service';
import { toFormDataFile } from '@/shared/utils/formData';

export default function AddDoctorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [userId, setUserId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [licenseDoc, setLicenseDoc] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLicenseDoc(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    const validationErrors: string[] = [];
    if (!userId.trim()) validationErrors.push('User ID is required.');
    if (!specialization.trim()) validationErrors.push('Specialization is required.');
    if (!experienceYears.trim() || Number(experienceYears) < 0)
      validationErrors.push('Valid experience years are required (must be 0 or greater).');
    if (!consultationFee.trim() || Number(consultationFee) < 0)
      validationErrors.push('Valid consultation fee is required (must be 0 or greater).');
    if (!licenseDoc) validationErrors.push('License document is required.');

    if (validationErrors.length > 0) {
      Alert.alert('Validation', validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId.trim());
      formData.append('specialization', specialization.trim());
      formData.append('experienceYears', experienceYears.trim());
      formData.append('consultationFee', consultationFee.trim());
      const file = toFormDataFile({
        uri: licenseDoc.uri,
        name: licenseDoc.name,
        mimeType: licenseDoc.mimeType ?? 'application/octet-stream',
      });

      formData.append('licenseDocument', file!);

      await doctorService.createDoctor(formData);
      Alert.alert('Success', 'Doctor profile created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create doctor.');
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
            Add New Doctor
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
            Link an existing user account to a doctor profile.
          </Text>

          {/* Doctor Information Section */}
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
              DOCTOR INFORMATION
            </Text>

            <Input
              label="User ID"
              placeholder="Paste the user's MongoDB _id"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Specialization"
              placeholder="e.g. Cardiology, Neurology"
              value={specialization}
              onChangeText={setSpecialization}
            />

            <Input
              label="Experience (Years)"
              placeholder="e.g. 5"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="numeric"
            />

            <Input
              label="Consultation Fee ($)"
              placeholder="e.g. 150"
              value={consultationFee}
              onChangeText={setConsultationFee}
              keyboardType="numeric"
            />
          </View>

          {/* License Document Section */}
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
              LICENSE DOCUMENT
            </Text>

            <TouchableOpacity
              onPress={pickDocument}
              disabled={submitting}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.primaryMuted,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                {licenseDoc ? licenseDoc.name : 'Select PDF or Image'}
              </Text>
            </TouchableOpacity>
            {licenseDoc && (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: spacing.sm,
                }}
              >
                {licenseDoc.mimeType} &mdash; {((licenseDoc.size ?? 0) / 1024).toFixed(1)} KB
              </Text>
            )}
          </View>

          <Button
            title="Create Doctor"
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
