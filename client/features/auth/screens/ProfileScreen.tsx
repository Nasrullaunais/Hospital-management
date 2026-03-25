import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@/shared/context/AuthContext';
import { authService, type UpdateProfilePayload } from '../services/auth.service';

/**
 * ProfileScreen — Member 1
 * Displays the current user's profile and allows editing name/phone/dateOfBirth.
 * TODO: Add ID document image picker (use expo-image-picker, upload as FormData).
 * TODO: Add avatar display from idDocumentUrl or a placeholder image.
 */
export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<UpdateProfilePayload>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
  });

  const update = (field: keyof UpdateProfilePayload) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      setLoading(true);
      await authService.updateProfile(form);
      await refreshUser();
      setEditing(false);
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

      {editing ? (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.outline, { flex: 1, marginRight: 8 }]}
            onPress={() => setEditing(false)}
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
});
