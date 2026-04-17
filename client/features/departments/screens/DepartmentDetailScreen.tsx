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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { departmentService } from '../services/department.service';
import type { Department } from '@/shared/types';
import { useAuth } from '@/shared/context/AuthContext';

export default function DepartmentDetailScreen() {
  const { id: departmentId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departmentService
      .getDepartmentById(departmentId)
      .then(setDepartment)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load department.'))
      .finally(() => setLoading(false));
  }, [departmentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !department) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Department not found.'}</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{department.name}</Text>
        <View style={[styles.badge, department.status === 'active' ? styles.badgeGreen : styles.badgeGray]}>
          <Text style={[styles.badgeText, department.status === 'active' ? styles.badgeTextGreen : styles.badgeTextGray]}>
            {department.status}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Detail label="Location" value={department.location} />
        <Detail label="Phone" value={department.phone} />
        {department.description && <Detail label="Description" value={department.description} />}
      </View>

      {/* Admin actions */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>Admin Actions</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert(
              'Edit Department',
              'Edit functionality will be available in a future update.',
            )}
          >
            <Text style={styles.editButtonText}>Edit Department</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { marginTop: 8, borderColor: '#ef4444' }]}
            onPress={() => {
              Alert.alert(
                'Delete Department',
                `Are you sure you want to delete ${department.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await departmentService.deleteDepartment(department._id);
                        Alert.alert('Deleted', 'Department has been removed.');
                        router.back();
                      } catch (err) {
                        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete department.');
                      }
                    },
                  },
                ],
              );
            }}
          >
            <Text style={[styles.editButtonText, { color: '#ef4444' }]}>Delete Department</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  name: { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginBottom: 4, flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfed6' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextGreen: { color: '#166534' },
  badgeTextGray: { color: '#6b7280' },
  section: { borderTopWidth: 1, borderColor: '#f0f0f0', paddingTop: 16, marginBottom: 24 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: '#888' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', flex: 1, textAlign: 'right', marginLeft: 16 },
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
