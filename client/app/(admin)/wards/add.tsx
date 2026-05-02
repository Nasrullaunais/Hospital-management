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
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { wardService } from '@/features/wards/services/ward.service';
import { WARD_TYPES } from '@/shared/constants/wardTypes';

export default function AddWardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<typeof WARD_TYPES[number]>('general');
  const [totalBeds, setTotalBeds] = useState('');
  const [currentOccupancy, setCurrentOccupancy] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationErrors: string[] = [];
    if (!name.trim()) validationErrors.push('Ward name is required.');
    if (!totalBeds.trim() || Number(totalBeds) <= 0) {
      validationErrors.push('Valid total beds count is required (must be greater than 0).');
    }
    const occupancy = Number(currentOccupancy);
    const beds = Number(totalBeds);
    if (!isNaN(occupancy) && occupancy < 0) {
      validationErrors.push('Current occupancy cannot be negative.');
    }
    if (!isNaN(occupancy) && !isNaN(beds) && beds > 0 && occupancy > beds) {
      validationErrors.push(`Current occupancy (${occupancy}) cannot exceed total beds (${beds}).`);
    }

    if (validationErrors.length > 0) {
      Alert.alert('Validation', validationErrors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      await wardService.createWard({
        name: name.trim(),
        type,
        totalBeds: Number(totalBeds),
        currentOccupancy: Number(currentOccupancy) || 0,
        location: location.trim() || undefined,
        phone: phone.trim() || undefined,
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
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Add New Ward
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
            Create a new hospital ward.
          </Text>

          {/* Ward Details Section */}
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
              WARD DETAILS
            </Text>

            <Input
              label="Ward Name"
              placeholder="e.g. Ward A, ICU Block 1"
              value={name}
              onChangeText={setName}
            />

            {/* Ward Type Selector */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: colors.textSecondary,
                  marginBottom: spacing.sm,
                }}
              >
                Ward Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {WARD_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 10,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: type === t ? colors.primary : colors.border,
                      backgroundColor: type === t ? colors.primaryMuted : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: type === t ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Input
              label="Total Beds"
              placeholder="e.g. 20"
              value={totalBeds}
              onChangeText={setTotalBeds}
              keyboardType="number-pad"
            />

            <Input
              label="Current Occupancy (Optional)"
              placeholder="e.g. 0"
              value={currentOccupancy}
              onChangeText={setCurrentOccupancy}
              keyboardType="number-pad"
            />

            <Input
              label="Location"
              placeholder="e.g. Building A, 2nd Floor"
              value={location}
              onChangeText={setLocation}
            />

            <Input
              label="Phone"
              placeholder="e.g. +1-555-0123"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <Button
            title="Create Ward"
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
