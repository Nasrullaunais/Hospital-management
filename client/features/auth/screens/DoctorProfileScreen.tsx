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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { doctorService, type UpdateDoctorPayload } from '@/features/doctors/services/doctor.service';
import { authService, type UpdateProfilePayload } from '@/features/auth/services/auth.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Badge, Button } from '@/components/ui';
import type { Doctor, DoctorAvailability, ApiSuccessResponse } from '@/shared/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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

  const initials = getInitials(user.name ?? '');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
          {doctorProfile && (
            <Text style={[styles.userSpecialty, { color: colors.textSecondary }]}>
              {doctorProfile.specialization}
            </Text>
          )}
          <Badge label={user.role.toUpperCase()} variant="primary" size="md" style={styles.roleBadge} />
        </View>

        {/* Personal Information Card */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personal Information</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            {editingUser ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={userForm.name}
                onChangeText={v => setUserForm(p => ({ ...p, name: v }))}
                placeholderTextColor={colors.inputPlaceholder}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>{user.name}</Text>
            )}
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user.email}</Text>
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
            {editingUser ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                value={userForm.phone}
                onChangeText={v => setUserForm(p => ({ ...p, phone: v }))}
                keyboardType="phone-pad"
                placeholderTextColor={colors.inputPlaceholder}
              />
            ) : (
              <Text style={[styles.value, { color: colors.text }]}>{user.phone || '—'}</Text>
            )}
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date of Birth</Text>
            {editingUser ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
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
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
                onPress={() => { setEditingUser(false); }}
                disabled={saving}
              >
                <Text style={[styles.editButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                onPress={() => void handleSaveUser()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.editButtonText, { color: '#fff' }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.editRowButton, { backgroundColor: colors.primaryMuted }]}
              onPress={() => setEditingUser(true)}
            >
              <Feather name="edit-2" size={16} color={colors.primary} />
              <Text style={[styles.editRowButtonText, { color: colors.primary }]}>Edit Personal Info</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Professional Information Card */}
        {doctorProfile && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Professional</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Specialization</Text>
                <Text style={[styles.value, { color: colors.text }]}>{doctorProfile.specialization}</Text>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Experience</Text>
                <Text style={[styles.value, { color: colors.text }]}>{doctorProfile.experienceYears} years</Text>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Consultation Fee</Text>
                <Text style={[styles.value, { color: colors.text }]}>${doctorProfile.consultationFee}</Text>
              </View>

              <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />

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
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
                    onPress={() => { setEditingAvailability(false); setSelectedAvailability(doctorProfile.availability); }}
                    disabled={saving}
                  >
                    <Text style={[styles.editButtonText, { color: colors.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                    onPress={() => void handleSaveAvailability()}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.editButtonText, { color: '#fff' }]}>Save</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.editRowButton, { backgroundColor: colors.primaryMuted }]}
                  onPress={() => setEditingAvailability(true)}
                >
                  <Feather name="edit-2" size={16} color={colors.primary} />
                  <Text style={[styles.editRowButtonText, { color: colors.primary }]}>Update Availability</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {!doctorProfile && (
          <View style={[styles.noDoctorProfile, { backgroundColor: colors.surfaceTertiary }]}>
            <Feather name="alert-circle" size={28} color={colors.warning} />
            <Text style={[styles.noDoctorText, { color: colors.textSecondary }]}>
              Doctor profile not found. Contact admin to set up your professional profile.
            </Text>
          </View>
        )}

        {/* Sign Out */}
        <Button
          title="Sign Out"
          onPress={logout}
          variant="danger"
          size="lg"
          fullWidth
          icon="log-out"
          style={styles.signOutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  content: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.lg },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    textAlign: 'center',
  },
  userSpecialty: {
    fontSize: 14,
    textAlign: 'center',
  },
  roleBadge: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  field: { marginBottom: 4 },
  fieldDivider: {
    height: 1,
    marginVertical: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { fontSize: 16, fontWeight: '500' },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  editActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: { fontSize: 15, fontWeight: '600' },
  editRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: 12,
  },
  editRowButtonText: { fontSize: 14, fontWeight: '600' },
  availabilityPicker: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  availDot: { width: 12, height: 12, borderRadius: 6 },
  availPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  availPillText: { fontSize: 13, fontWeight: '600' },
  noDoctorProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: 8,
  },
  noDoctorText: { flex: 1, fontSize: 14, lineHeight: 20 },
  signOutButton: {
    marginTop: 32,
    marginBottom: 16,
  },
});
