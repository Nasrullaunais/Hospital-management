import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { departmentService } from '@/features/departments/services/department.service';

const makeStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors[colorScheme].background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: Colors[colorScheme].text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors[colorScheme].textSecondary, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: Colors[colorScheme].textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors[colorScheme].surface,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: Colors[colorScheme].primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default function AddDepartmentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const styles = useMemo(() => makeStyles(colorScheme), [colorScheme]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [headDoctorId, setHeadDoctorId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Validation', 'Department name is required.');
    if (!location.trim()) return Alert.alert('Validation', 'Location is required.');
    if (!phone.trim()) return Alert.alert('Validation', 'Phone number is required.');
    if (!description.trim()) return Alert.alert('Validation', 'Description is required.');

    setSubmitting(true);
    try {
      await departmentService.createDepartment({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        phone: phone.trim(),
        headDoctorId: headDoctorId.trim() || undefined,
        status: 'active',
      });
      Alert.alert('Success', 'Department created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add New Department</Text>
        <Text style={styles.subtitle}>
          Create a new hospital department.
        </Text>

        <Text style={styles.label}>Department Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Cardiology, Neurology"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Building A, Floor 3"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +1 234 567 8900"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Brief description of the department"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Head Doctor ID (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="MongoDB _id of the head doctor"
          value={headDoctorId}
          onChangeText={setHeadDoctorId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Department</Text>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
