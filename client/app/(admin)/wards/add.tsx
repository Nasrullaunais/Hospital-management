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
import { useRouter } from 'expo-router';
import { wardService } from '@/features/wards/services/ward.service';

const WARD_TYPES = ['general', 'private', 'icu', 'emergency'] as const;

export default function AddWardScreen() {
  const router = useRouter();

  const [departmentId, setDepartmentId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<typeof WARD_TYPES[number]>('general');
  const [totalBeds, setTotalBeds] = useState('');
  const [currentOccupancy, setCurrentOccupancy] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!departmentId.trim()) return Alert.alert('Validation', 'Department ID is required.');
    if (!name.trim()) return Alert.alert('Validation', 'Ward name is required.');
    if (!totalBeds.trim() || Number(totalBeds) <= 0)
      return Alert.alert('Validation', 'Valid total beds count is required.');

    setSubmitting(true);
    try {
      await wardService.createWard({
        departmentId: departmentId.trim(),
        name: name.trim(),
        type,
        totalBeds: Number(totalBeds),
        currentOccupancy: Number(currentOccupancy) || 0,
      });
      Alert.alert('Success', 'Ward created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create ward.');
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
        <Text style={styles.title}>Add New Ward</Text>
        <Text style={styles.subtitle}>
          Create a new hospital ward.
        </Text>

        <Text style={styles.label}>Department ID</Text>
        <TextInput
          style={styles.input}
          placeholder="MongoDB _id of the parent department"
          value={departmentId}
          onChangeText={setDepartmentId}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Ward Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ward A, ICU Block 1"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Ward Type</Text>
        <View style={styles.typeContainer}>
          {WARD_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeButton, type === t && styles.typeButtonActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeButtonText, type === t && styles.typeButtonTextActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Total Beds</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 20"
          value={totalBeds}
          onChangeText={setTotalBeds}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Current Occupancy (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 0"
          value={currentOccupancy}
          onChangeText={setCurrentOccupancy}
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Ward</Text>
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
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#2563eb',
  },
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
