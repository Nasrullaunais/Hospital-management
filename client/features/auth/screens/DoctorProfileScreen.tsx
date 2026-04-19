import React, { useState, useEffect, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { doctorService, type UpdateDoctorPayload } from '@/features/doctors/services/doctor.service';
import { authService, type UpdateProfilePayload } from '@/features/auth/services/auth.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Doctor, DoctorAvailability, ApiSuccessResponse } from '@/shared/types';

const AVAILABILITY_OPTIONS: { label: string; value: DoctorAvailability; color: string }[] = [
  { label: 'Available', value: 'Available', color: '#22c55e' },
  { label: 'Unavailable', value: 'Unavailable', color: '#ef4444' },
  { label: 'On Leave', value: 'On Leave', color: '#f59e0b' },
];

const TAB_BAR_HEIGHT = 70;

export default function DoctorProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(false);

  const [doctorProfile, setDoctorProfile] = useState<Doctor | null>(null);
  const [userForm, setUserForm] = useState<UpdateProfilePayload>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    dateOfBirth: user?.dateOfBirth ?? '',
  });
  const [selectedAvailability, setSelectedAvailability] = useState<DoctorAvailability>('Available');

  const loadDoctorProfile = useCallback(async () => {
    try {
      const doc = await doctorService.getMyDoctorProfile();
      setDoctorProfile(doc);
      setSelectedAvailability(doc.availability);
    } catch {
      // Doctor profile may not exist yet for all doctor accounts
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    void loadDoctorProfile();
  }, [user, router, loadDoctorProfile]);

  const handleSaveUser = async () => {
    try {
      setSaving(true);
      await authService.updateProfile(userForm);
      await refreshUser();
      setEditingUser(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      const payload: UpdateDoctorPayload = { availability: selectedAvailability };
      const updated = await doctorService.updateDoctor(doctorProfile!._id, payload);
      setDoctorProfile(updated);
      setEditingAvailability(false);
      Alert.alert('Success', 'Availability updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (loadingProfile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>

        <View style={[styles.roleTag, { backgroundColor: colors.primaryMuted }]}>
          <Text style={[styles.roleText, { color: colors.primary }]}>{user.role.toUpperCase()}</Text>
        </View>


        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personal Information</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
          {editingUser ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={userForm.name}
              onChangeText={v => setUserForm(p => ({ ...p, name: v }))}
              placeholderTextColor={colors.inputPlaceholder}
            />
          ) : (
            <Text style={[styles.value, { color: colors.text }]}>{user.name}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user.email}</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
          {editingUser ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={userForm.phone}
              onChangeText={v => setUserForm(p => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
              placeholderTextColor={colors.inputPlaceholder}
            />
          ) : (
            <Text style={[styles.value, { color: colors.text }]}>{user.phone || '—'}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
          {editingUser ? (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={userForm.dateOfBirth}
              onChangeText={v => setUserForm(p => ({ ...p, dateOfBirth: v }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inputPlaceholder}
            />
          ) : (
            <Text style={[styles.value, { color: colors.text }]}>{user.dateOfBirth || '—'}</Text>
          )}
        </View>

        {editingUser ? (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, { flex: 1, marginRight: 8, backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
              onPress={() => { setEditingUser(false); }}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { flex: 1, backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={() => void handleSaveUser()}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => setEditingUser(true)}
          >
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor="#fff" size={14} />
            <Text style={styles.buttonText}>Edit Personal Info</Text>
          </TouchableOpacity>
        )}

        {doctorProfile && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Professional Information</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Specialization</Text>
              <Text style={[styles.value, { color: colors.text }]}>{doctorProfile.specialization}</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Experience</Text>
              <Text style={[styles.value, { color: colors.text }]}>{doctorProfile.experienceYears} years</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Consultation Fee</Text>
              <Text style={[styles.value, { color: colors.text }]}>${doctorProfile.consultationFee}</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Availability</Text>
              {editingAvailability ? (
                <View style={styles.availabilityPicker}>
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.availPill,
                        {
                          backgroundColor: selectedAvailability === opt.value ? opt.color : colors.surface,
                          borderColor: opt.color,
                        },
                      ]}
                      onPress={() => setSelectedAvailability(opt.value)}
                    >
                      <Text
                        style={[
                          styles.availPillText,
                          { color: selectedAvailability === opt.value ? '#fff' : opt.color },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.availBadge}>
                  <View
                    style={[
                      styles.availDot,
                      {
                        backgroundColor:
                          doctorProfile.availability === 'Available'
                            ? '#22c55e'
                            : doctorProfile.availability === 'On Leave'
                            ? '#f59e0b'
                            : '#ef4444',
                      },
                    ]}
                  />
                  <Text style={[styles.value, { color: colors.text }]}>{doctorProfile.availability}</Text>
                </View>
              )}
            </View>

            {editingAvailability ? (
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.button, { flex: 1, marginRight: 8, backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
                  onPress={() => { setEditingAvailability(false); setSelectedAvailability(doctorProfile.availability); }}
                  disabled={saving}
                >
                  <Text style={[styles.buttonText, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { flex: 1, backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                  onPress={() => void handleSaveAvailability()}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => setEditingAvailability(true)}
              >
                <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} tintColor="#fff" size={14} />
                <Text style={styles.buttonText}>Update Availability</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {!doctorProfile && (
          <View style={[styles.noDoctorProfile, { backgroundColor: colors.surfaceTertiary }]}>
            <SymbolView name={{ ios: 'person.crop.circle.badge.exclamationmark', android: 'person', web: 'person' }} tintColor={colors.warning} size={28} />
            <Text style={[styles.noDoctorText, { color: colors.textSecondary }]}>
              Doctor profile not found. Contact admin to set up your professional profile.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error, marginTop: 24 }]}
          onPress={logout}
        >
          <SymbolView name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'lock_open', web: 'logout' }} tintColor="#fff" size={14} />
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 16,
  },
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
    gap: 6,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  availabilityPicker: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  availDot: { width: 10, height: 10, borderRadius: 5 },
  availPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  availPillText: { fontSize: 13, fontWeight: '600' },
  noDoctorProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noDoctorText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
