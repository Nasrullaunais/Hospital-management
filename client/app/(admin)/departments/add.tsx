import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { departmentService } from '@/features/departments/services/department.service';
import { doctorService } from '@/features/doctors/services/doctor.service';
import { ApiError } from '@/shared/types';

export default function AddDepartmentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [headDoctorId, setHeadDoctorId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationErrors: string[] = [];
    if (!name.trim()) validationErrors.push('Department name is required.');
    if (!location.trim()) validationErrors.push('Location is required.');
    if (!phone.trim()) validationErrors.push('Phone number is required.');
    if (!description.trim()) validationErrors.push('Description is required.');

    if (headDoctorId.trim()) {
      const objectIdRegex = /^[a-fA-F0-9]{24}$/;
      if (!objectIdRegex.test(headDoctorId.trim())) {
        validationErrors.push('Head Doctor ID must be a valid 24-character hex string.');
      }
    }

    if (validationErrors.length > 0) {
      Alert.alert('Validation', validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      if (headDoctorId.trim()) {
        try {
          await doctorService.getDoctorById(headDoctorId.trim());
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            Alert.alert('Validation', 'Head Doctor not found. Please check the ID and try again.');
          } else {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to verify head doctor.');
          }
          setSubmitting(false);
          return;
        }
      }

      await departmentService.createDepartment({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        phone: phone.trim(),
        headDoctorId: headDoctorId.trim(),
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
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Add New Department
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
            Create a new hospital department.
          </Text>

          {/* Department Details Section */}
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
              DEPARTMENT DETAILS
            </Text>

            <Input
              label="Department Name"
              placeholder="e.g. Cardiology, Neurology"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Location"
              placeholder="e.g. Building A, Floor 3"
              value={location}
              onChangeText={setLocation}
            />

            <Input
              label="Phone Number"
              placeholder="e.g. +1 234 567 8900"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Description"
              placeholder="Brief description of the department"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              containerStyle={{ minHeight: 100 }}
            />

            <Input
              label="Head Doctor ID (Optional)"
              placeholder="MongoDB _id of the head doctor"
              value={headDoctorId}
              onChangeText={setHeadDoctorId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Button
            title="Create Department"
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
