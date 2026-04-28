import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/shared/context/AuthContext';
import { authService, type UpdateProfilePayload } from '../services/auth.service';
import { Config } from '@/shared/constants/Config';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const TAB_BAR_HEIGHT = 70;

interface FileLike extends Blob {
  uri: string;
  name: string;
  mimeType?: string;
}

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [form, setForm] = useState<UpdateProfilePayload>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
  });

  const update = (field: keyof UpdateProfilePayload) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (selectedFile) {
        const formData = new FormData();
        if (form.name) formData.append('name', form.name);
        if (form.phone) formData.append('phone', form.phone);
        if (form.dateOfBirth) formData.append('dateOfBirth', form.dateOfBirth);

        formData.append('idDocument', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType ?? 'application/octet-stream',
        } as FileLike);

        await authService.updateProfile(formData);
      } else {
        await authService.updateProfile(form);
      }

      await refreshUser();
      setEditing(false);
      setSelectedFile(null);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  const isImageUrl = user.idDocumentUrl && /\.(jpe?g|png|gif|webp)$/i.test(user.idDocumentUrl);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.md }}>
        {/* Profile Header Section */}
        <View
          style={{
            alignItems: 'center',
            paddingVertical: spacing.xl,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            marginBottom: spacing.md,
            ...shadows.card,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF' }}>
              {initials}
            </Text>
          </View>

          {/* Name */}
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            {user.name}
          </Text>

          {/* Email */}
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm }}>
            {user.email}
          </Text>

          {/* Role Badge */}
          <Badge label={user.role.toUpperCase()} variant="primary" size="md" />
        </View>

        {/* Personal Information Section */}
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
            PERSONAL INFORMATION
          </Text>

          {editing ? (
            <>
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={form.name}
                onChangeText={update('name')}
              />

              <Input
                label="Phone"
                placeholder="Enter your phone number"
                value={form.phone}
                onChangeText={update('phone')}
                keyboardType="phone-pad"
              />

              <Input
                label="Date of Birth"
                placeholder="YYYY-MM-DD"
                value={form.dateOfBirth}
                onChangeText={update('dateOfBirth')}
              />
            </>
          ) : (
            <>
              <InfoRow label="Full Name" value={user.name} colors={colors} />
              <InfoRow label="Email" value={user.email} colors={colors} />
              <InfoRow label="Phone" value={user.phone || '\u2014'} colors={colors} />
              <InfoRow label="Date of Birth" value={user.dateOfBirth || '\u2014'} colors={colors} />
            </>
          )}
        </View>

        {/* ID Document Section */}
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
            ID DOCUMENT
          </Text>

          {editing ? (
            <View>
              <TouchableOpacity
                onPress={pickDocument}
                activeOpacity={0.7}
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  backgroundColor: colors.primaryMuted,
                  paddingVertical: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                <Feather name="upload" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                  {selectedFile ? selectedFile.name : 'Select ID Document'}
                </Text>
              </TouchableOpacity>
              {selectedFile && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: spacing.sm,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {selectedFile.mimeType} &mdash; {((selectedFile.size ?? 0) / 1024).toFixed(1)} KB
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : user.idDocumentUrl ? (
            isImageUrl ? (
              <Image
                source={{ uri: `${Config.BASE_URL}${user.idDocumentUrl}` }}
                style={{
                  width: '100%',
                  height: 200,
                  borderRadius: radius.xs,
                  backgroundColor: colors.surfaceTertiary,
                }}
                resizeMode="contain"
              />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.sm,
                  borderRadius: radius.xs,
                  backgroundColor: colors.surfaceTertiary,
                }}
              >
                <Feather name="file-text" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  Document uploaded ({user.idDocumentUrl.split('/').pop()})
                </Text>
              </View>
            )
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              No document uploaded
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        {editing ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              title="Save Changes"
              variant="accent"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleSave}
            />
            <Button
              title="Cancel"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => { setEditing(false); setSelectedFile(null); }}
              disabled={loading}
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              title="Edit Profile"
              variant="accent"
              size="lg"
              fullWidth
              icon="edit-2"
              onPress={() => setEditing(true)}
            />
            <Button
              title="Sign Out"
              variant="danger"
              size="lg"
              fullWidth
              icon="log-out"
              onPress={handleLogout}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: Record<string, string>;
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 16, color: colors.text }}>{value}</Text>
    </View>
  );
}
