import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { doctorService } from '@/features/doctors/services/doctor.service';

export default function AddDoctorScreen() {
  const router = useRouter();

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
    if (!userId.trim()) return Alert.alert('Validation', 'User ID is required.');
    if (!specialization.trim()) return Alert.alert('Validation', 'Specialization is required.');
    if (!experienceYears.trim() || Number(experienceYears) < 0)
      return Alert.alert('Validation', 'Valid experience years are required.');
    if (!consultationFee.trim() || Number(consultationFee) < 0)
      return Alert.alert('Validation', 'Valid consultation fee is required.');
    if (!licenseDoc) return Alert.alert('Validation', 'License document is required.');

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId.trim());
      formData.append('specialization', specialization.trim());
      formData.append('experienceYears', experienceYears.trim());
      formData.append('consultationFee', consultationFee.trim());
      formData.append('licenseDocument', {
        uri: licenseDoc.uri,
        name: licenseDoc.name,
        type: licenseDoc.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add New Doctor</Text>
        <Text style={styles.subtitle}>
          Link an existing user account to a doctor profile.
        </Text>

        <Text style={styles.label}>User ID</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste the user's MongoDB _id"
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Specialization</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Cardiology, Neurology"
          value={specialization}
          onChangeText={setSpecialization}
        />

        <Text style={styles.label}>Experience (years)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 5"
          value={experienceYears}
          onChangeText={setExperienceYears}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Consultation Fee ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 150"
          value={consultationFee}
          onChangeText={setConsultationFee}
          keyboardType="numeric"
        />

        <Text style={styles.label}>License Document</Text>
        <TouchableOpacity style={styles.pickButton} onPress={pickDocument}>
          <Text style={styles.pickButtonText}>
            {licenseDoc ? licenseDoc.name : 'Select PDF or Image'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Doctor</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  pickButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pickButtonText: { fontSize: 14, color: '#2563eb' },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
