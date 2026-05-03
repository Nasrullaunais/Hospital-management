import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { staffService } from '@/features/staff/services/staff.service';
import type { User } from '@/shared/types';

type StaffRole = 'receptionist' | 'pharmacist';

const ROLES: { key: StaffRole; label: string; desc: string }[] = [
  { key: 'receptionist', label: 'Receptionist', desc: 'Front desk & patient intake' },
  { key: 'pharmacist', label: 'Pharmacist', desc: 'Medication & prescription mgmt' },
];

export default function StaffEditScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const params = useLocalSearchParams<{ id: string }>();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Staff ID not found.');
      setLoading(false);
      return;
    }

    const fetchStaff = async () => {
      try {
        const staff: User = await staffService.getStaffById(id);
        setName(staff.name ?? '');
        setEmail(staff.email ?? '');
        setPhone(staff.phone ?? '');
        setRole(staff.role as StaffRole | null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load staff details.');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [id]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSave = async () => {
    const validationErrors: string[] = [];
    if (!name.trim()) validationErrors.push('Name is required.');
    if (!email.trim()) validationErrors.push('Email is required.');
    else if (!validateEmail(email.trim())) validationErrors.push('Please enter a valid email address.');
    if (phone && (phone.length < 7 || phone.length > 15)) {
      validationErrors.push('Phone must be between 7 and 15 characters if provided.');
    }

    if (validationErrors.length > 0) {
      Alert.alert('Validation', validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      await staffService.updateStaff(id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role: role ?? undefined,
      });
      Alert.alert('Success', 'Staff details updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update staff.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
        <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: spacing.md }}>{error}</Text>
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
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Edit Staff
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
            Update staff member details.
          </Text>

          {/* Edit Details Section */}
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
              EDIT DETAILS
            </Text>

            <Input
              label="Full Name"
              placeholder="e.g. Jane Smith"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Email Address"
              placeholder="e.g. jane@hospital.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Phone"
              placeholder="Optional"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Role Selection Section */}
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
              SELECT ROLE
            </Text>

            {ROLES.map((r) => {
              const selected = role === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRole(r.key)}
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
                      {r.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: selected ? colors.primary : colors.textTertiary,
                        marginTop: 1,
                      }}
                    >
                      {r.desc}
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