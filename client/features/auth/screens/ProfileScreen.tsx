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
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/shared/context/AuthContext';
import { authService, type UpdateProfilePayload } from '../services/auth.service';
import { Config } from '@/shared/constants/Config';

/**
 * ProfileScreen — Member 1
 * Displays the current user's profile and allows editing name/phone/dateOfBirth.
 * Supports uploading an ID document (image or PDF) via expo-document-picker.
 */
export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

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

        // React Native FormData expects { uri, name, type } cast to any
        formData.append('idDocument', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType ?? 'application/octet-stream',
        } as any);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.roleTag}>
        <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Full Name</Text>
        {editing ? (
          <TextInput style={styles.input} value={form.name} onChangeText={update('name')} />
        ) : (
          <Text style={styles.value}>{user.name}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={update('phone')}
            keyboardType="phone-pad"
          />
        ) : (
          <Text style={styles.value}>{user.phone || '—'}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date of Birth</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={form.dateOfBirth}
            onChangeText={update('dateOfBirth')}
            placeholder="YYYY-MM-DD"
          />
        ) : (
          <Text style={styles.value}>{user.dateOfBirth || '—'}</Text>
        )}
      </View>

      {/* ID Document Section */}
      <View style={styles.field}>
        <Text style={styles.label}>ID Document</Text>
        {editing ? (
          <View>
            <TouchableOpacity style={styles.pickButton} onPress={pickDocument}>
              <Text style={styles.pickButtonText}>
                {selectedFile ? selectedFile.name : 'Select ID Document'}
              </Text>
            </TouchableOpacity>
            {selectedFile && (
              <Text style={styles.fileHint}>
                {selectedFile.mimeType} — {((selectedFile.size ?? 0) / 1024).toFixed(1)} KB
              </Text>
            )}
          </View>
        ) : user.idDocumentUrl ? (
          isImageUrl ? (
            <Image
              source={{ uri: `${Config.BASE_URL}${user.idDocumentUrl}` }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.documentLink}>
              📄 Document uploaded ({user.idDocumentUrl.split('/').pop()})
            </Text>
          )
        ) : (
          <Text style={styles.value}>No document uploaded</Text>
        )}
      </View>

      {editing ? (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.outline, { flex: 1, marginRight: 8 }]}
            onPress={() => { setEditing(false); setSelectedFile(null); }}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#2563eb' }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => setEditing(true)}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, styles.danger, { marginTop: 12 }]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8, color: '#1a1a2e' },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 24,
  },
  roleText: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 16, color: '#1a1a2e' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', marginTop: 8 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2563eb' },
  danger: { backgroundColor: '#ef4444' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  pickButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
  },
  pickButtonText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
  fileHint: { color: '#888', fontSize: 12, marginTop: 4 },
  documentImage: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#f5f5f5' },
  documentLink: { fontSize: 14, color: '#2563eb' },
});
