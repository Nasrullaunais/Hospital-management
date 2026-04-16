import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { doctorService } from '../services/doctor.service';
import type { Doctor } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

/**
 * DoctorDetailScreen — Member 2
 * Full profile view for a single doctor.
 * TODO: Accept `doctorId` from navigation params (Expo Router: useLocalSearchParams).
 * TODO: Add "Book Appointment" button that navigates to BookAppointmentScreen with doctorId pre-filled.
 * TODO: Admin: add Edit/Delete actions via admin role check.
 */
export default function DoctorDetailScreen() {
  const { id: doctorId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    doctorService
      .getDoctorById(doctorId)
      .then(setDoctor)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load doctor.'))
      .finally(() => setLoading(false));
  }, [doctorId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !doctor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Doctor not found.'}</Text>
      </View>
    );
  }

  const doctorName = typeof doctor.userId === 'object' ? doctor.userId.name : 'Unknown';
  const isAdmin = user?.role === 'admin';
  const canBookAppointment = user?.role === 'patient';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{doctorName}</Text>
        <Text style={styles.specialization}>{doctor.specialization}</Text>
        <View
          style={[
            styles.badge,
            doctor.availability === 'Available' ? styles.badgeGreen : styles.badgeGray,
          ]}
        >
          <Text style={styles.badgeText}>{doctor.availability}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Detail label="Experience" value={`${doctor.experienceYears} years`} />
        <Detail label="Consultation Fee" value={`$${doctor.consultationFee}`} />
        {doctor.licenseDocumentUrl && (
          <Detail label="License Document" value="On file ✓" />
        )}
      </View>

      {canBookAppointment && (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => {
            router.push({ pathname: '/(patient)/appointments/book', params: { doctorId: doctor._id } } as Href);
          }}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>Admin Actions</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert(
              'Edit Doctor',
              'Edit functionality will be available in a future update.',
            )}
          >
            <Text style={styles.editButtonText}>Edit Doctor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { marginTop: 8, borderColor: '#ef4444' }]}
            onPress={() => {
              Alert.alert('Delete Doctor', `Are you sure you want to delete Dr. ${doctorName}?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await doctorService.deleteDoctor(doctor._id);
                      Alert.alert('Deleted', 'Doctor has been removed.');
                      router.back();
                    } catch (err) {
                      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete doctor.');
                    }
                  },
                },
              ]);
            }}
          >
            <Text style={[styles.editButtonText, { color: '#ef4444' }]}>Delete Doctor</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
  header: { marginBottom: 24 },
  name: { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  specialization: { fontSize: 16, color: '#2563eb', marginBottom: 10 },
  badge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  section: { borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 16, marginBottom: 24 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: '#888' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  bookButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  adminSection: { marginTop: 24, borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 16 },
  adminLabel: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  editButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: { color: '#374151', fontWeight: '600' },
});
