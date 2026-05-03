import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { doctorService } from '../services/doctor.service';
import type { Doctor } from '@/shared/types';

type Availability = 'Available' | 'Unavailable' | 'On Leave';

const AVAILABILITIES: { key: Availability; label: string; desc: string }[] = [
  { key: 'Available', label: 'Available', desc: 'Can accept appointments' },
  { key: 'Unavailable', label: 'Unavailable', desc: 'Not available for appointments' },
  { key: 'On Leave', label: 'On Leave', desc: 'Temporarily on leave' },
];

export default function DoctorEditScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ id: string }>();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Doctor ID not found.');
      setLoading(false);
      return;
    }

    const fetchDoctor = async () => {
      try {
        const doctor: Doctor = await doctorService.getDoctorById(id);
        const name =
          doctor.userId && typeof doctor.userId === 'object' ? doctor.userId.name : 'Unknown';
        setDoctorName(name);
        setSpecialization(doctor.specialization ?? '');
        setExperienceYears(String(doctor.experienceYears ?? ''));
        setConsultationFee(String(doctor.consultationFee ?? ''));
        setAvailability(doctor.availability ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load doctor details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  const handleSave = async () => {
    const validationErrors: string[] = [];
    if (!specialization.trim()) validationErrors.push('Specialization is required.');
    const expNum = Number(experienceYears);
    if (!experienceYears.trim()) validationErrors.push('Experience years is required.');
    else if (isNaN(expNum) || expNum < 0) validationErrors.push('Experience years must be a number >= 0.');
    const feeNum = Number(consultationFee);
    if (!consultationFee.trim()) validationErrors.push('Consultation fee is required.');
    else if (isNaN(feeNum) || feeNum < 0) validationErrors.push('Consultation fee must be a number >= 0.');
    if (!availability) validationErrors.push('Availability is required.');

    if (validationErrors.length > 0) {
      Alert.alert('Validation', validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      await doctorService.updateDoctor(id, {
        specialization: specialization.trim(),
        experienceYears: expNum,
        consultationFee: feeNum,
        availability: availability!,
      });
      Alert.alert('Success', 'Doctor profile updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}
      >
        <Feather name="alert-circle" size={48} color={colors.error} />
        <Text style={{ fontSize: typography.md, color: colors.text, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.lg }}>
          {error}
        </Text>
        <Button title="Go Back" variant="accent" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Text style={{ fontSize: typography.xl, fontWeight: typography.bold, color: colors.text }}>
              {doctorName}
            </Text>
            <Text style={{ fontSize: typography.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
              Doctor Profile
            </Text>
          </View>

          {/* Edit Profile Section */}
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
              EDIT PROFILE
            </Text>

            <Input
              label="Specialization"
              placeholder="e.g. Cardiology"
              value={specialization}
              onChangeText={setSpecialization}
              autoCapitalize="words"
            />

            <Input
              label="Experience (years)"
              placeholder="e.g. 5"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="numeric"
            />

            <Input
              label="Consultation Fee ($)"
              placeholder="e.g. 150.00"
              value={consultationFee}
              onChangeText={setConsultationFee}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Availability Section */}
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
              AVAILABILITY
            </Text>

            {AVAILABILITIES.map((a) => {
              const selected = availability === a.key;
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={() => setAvailability(a.key)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: 14,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primaryMuted : colors.surface,
                    marginBottom: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.textTertiary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.sm,
                    }}
                  >
                    {selected && (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: colors.primary,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: selected ? colors.primary : colors.text,
                      }}
                    >
                      {a.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: selected ? colors.primary : colors.textTertiary,
                        marginTop: 1,
                      }}
                    >
                      {a.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Button
            title="Save Changes"
            variant="accent"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSave}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}