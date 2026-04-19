import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/shared/context/AuthContext';
import { authService, type UpdateProfilePayload } from '../services/auth.service';
import { Config } from '@/shared/constants/Config';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const TAB_BAR_HEIGHT = 70;

/**
 * Minimal file-like object accepted by React Native's FormData.append.
 * Matches the shape returned by expo-document-picker with the additional
 * Blob properties required by the FormData spec.
 */
interface FileLike extends Blob {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * ProfileScreen — Member 1
 * Displays the current user's profile and allows editing name/phone/dateOfBirth.
 * Supports uploading an ID document (image or PDF) via expo-document-picker.
 */
export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

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
        // Use FormData for file upload
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

  const isImageUrl = user.idDocumentUrl && /\.(jpe?g|png|gif|webp)$/i.test(user.idDocumentUrl);

return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>My Profile</Text>

        <View style={[styles.roleTag, { backgroundColor: theme.primaryMuted }]}>
          <Text style={[styles.roleText, { color: theme.primary }]}>{user.role.toUpperCase()}</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
          {editing ? (
            <TextInput style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]} value={form.name} onChangeText={update('name')} placeholderTextColor={theme.placeholder} />
        ) : (
          <Text style={[styles.value, { color: theme.text }]}>{user.name}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
        <Text style={[styles.value, { color: theme.text }]}>{user.email}</Text>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Phone</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={form.phone}
              onChangeText={update('phone')}
              keyboardType="phone-pad"
              placeholderTextColor={theme.placeholder}
            />
          ) : (
            <Text style={[styles.value, { color: theme.text }]}>{user.phone || '—'}</Text>
          )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Date of Birth</Text>
          {editing ? (
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              value={form.dateOfBirth}
              onChangeText={update('dateOfBirth')}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.placeholder}
            />
          ) : (
            <Text style={[styles.value, { color: theme.text }]}>{user.dateOfBirth || '—'}</Text>
          )}
      </View>

      {/* ID Document Section */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>ID Document</Text>
        {editing ? (
          <View>
            <TouchableOpacity style={[styles.pickButton, { borderColor: theme.primary, backgroundColor: theme.primaryMuted }]} onPress={pickDocument}>
              <Feather name="upload" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.pickButtonText, { color: theme.primary }]}>
                {selectedFile ? selectedFile.name : 'Select ID Document'}
              </Text>
            </TouchableOpacity>
            {selectedFile && (
              <View style={styles.fileInfo}>
                <Text style={[styles.fileHint, { color: theme.textSecondary }]}>
                  {selectedFile.mimeType} — {((selectedFile.size ?? 0) / 1024).toFixed(1)} KB
                </Text>
                <TouchableOpacity onPress={() => setSelectedFile(null)}>
                  <Text style={[styles.removeFile, { color: theme.error }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : user.idDocumentUrl ? (
          isImageUrl ? (
            <Image
              source={{ uri: `${Config.BASE_URL}${user.idDocumentUrl}` }}
              style={[styles.documentImage, { backgroundColor: theme.surfaceTertiary }]}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.documentLink, { backgroundColor: theme.surfaceTertiary }]}>
              <Feather name="file-text" size={16} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.documentLinkText, { color: theme.primary }]}>Document uploaded ({user.idDocumentUrl.split('/').pop()})</Text>
            </View>
          )
        ) : (
          <Text style={[styles.value, { color: theme.textSecondary }]}>No document uploaded</Text>
        )}
      </View>

      {editing ? (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.outline, { flex: 1, marginRight: 8, backgroundColor: theme.surface, borderColor: theme.primary }]}
            onPress={() => { setEditing(false); setSelectedFile(null); }}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { flex: 1, backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={() => setEditing(true)} activeOpacity={0.8}>
          <Feather name="edit-2" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, styles.danger, { marginTop: 12, backgroundColor: theme.error }]} onPress={handleLogout} activeOpacity={0.8}>
        <Feather name="log-out" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: TAB_BAR_HEIGHT + 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  roleTag: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 24,
  },
  roleText: { fontSize: 12, fontWeight: '600' },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: { flexDirection: 'row', marginTop: 8 },
  button: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  outline: { backgroundColor: '#ffffff', borderWidth: 1 },
  danger: {},
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pickButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pickButtonText: { fontSize: 14, fontWeight: '500' },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fileHint: { fontSize: 12 },
  removeFile: { fontSize: 12, fontWeight: '600' },
  documentImage: { width: '100%', height: 200, borderRadius: 8 },
  documentLink: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  documentLinkText: { fontSize: 14 },
});
