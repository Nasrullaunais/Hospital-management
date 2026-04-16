import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { recordService } from '@/features/records/services/record.service';
import type { ApiSuccessResponse, Appointment, User } from '@/shared/types';

type PatientOption = {
  appointmentId: string;
  patientId: string;
  patientName: string;
};

export default function AddRecordScreen() {
  const router = useRouter();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [labFile, setLabFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch the doctor's own schedule and extract unique patients from
  // Confirmed / Completed appointments
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await apiClient.get<ApiSuccessResponse<{ appointments: Appointment[] }>>(
          ENDPOINTS.APPOINTMENTS.MY_DOCTOR_SCHEDULE,
        );
        const appointments = res.data.data.appointments;
        const seen = new Set<string>();
        const options: PatientOption[] = [];

        for (const appt of appointments) {
          if (appt.status !== 'Confirmed' && appt.status !== 'Completed') continue;
          const patient = appt.patientId as User;
          if (seen.has(patient._id)) continue;
          seen.add(patient._id);
          options.push({
            appointmentId: appt._id,
            patientId: patient._id,
            patientName: patient.name,
          });
        }

        setPatients(options);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load appointments.';
        Alert.alert('Error', message);
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  const pickLabReport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        setLabFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Validation', 'Please select a patient.');
      return;
    }
    if (!diagnosis.trim()) {
      Alert.alert('Validation', 'Diagnosis is required.');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('patientId', selectedPatient.patientId);
      formData.append('diagnosis', diagnosis.trim());
      if (prescription.trim()) {
        formData.append('prescription', prescription.trim());
      }
      if (labFile) {
        formData.append('labReport', {
          uri: labFile.uri,
          name: labFile.name,
          type: labFile.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }

      await recordService.createRecord(formData);
      Alert.alert('Success', 'Medical record created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create record.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPatients) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading patients…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Patient Selector */}
        <Text style={styles.label}>Patient *</Text>
        {patients.length === 0 ? (
          <Text style={styles.hint}>No confirmed/completed appointments found.</Text>
        ) : (
          <View style={styles.patientList}>
            {patients.map((p) => (
              <TouchableOpacity
                key={p.patientId}
                style={[
                  styles.patientChip,
                  selectedPatient?.patientId === p.patientId && styles.patientChipSelected,
                ]}
                onPress={() => setSelectedPatient(p)}
              >
                <Text
                  style={[
                    styles.patientChipText,
                    selectedPatient?.patientId === p.patientId && styles.patientChipTextSelected,
                  ]}
                >
                  {p.patientName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Diagnosis */}
        <Text style={styles.label}>Diagnosis *</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Enter diagnosis details…"
          placeholderTextColor="#9CA3AF"
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Prescription */}
        <Text style={styles.label}>Prescription</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Enter prescription or treatment plan… (optional)"
          placeholderTextColor="#9CA3AF"
          value={prescription}
          onChangeText={setPrescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Lab Report Upload */}
        <Text style={styles.label}>Lab Report</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={() => void pickLabReport()}>
          <Text style={styles.uploadButtonText}>
            {labFile ? `📎 ${labFile.name}` : 'Attach PDF or Image (optional)'}
          </Text>
        </TouchableOpacity>
        {labFile ? (
          <TouchableOpacity onPress={() => setLabFile(null)}>
            <Text style={styles.removeFile}>Remove file</Text>
          </TouchableOpacity>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Record</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 15,
  },
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  patientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  patientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  patientChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  patientChipText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  patientChipTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  multiline: {
    minHeight: 100,
  },
  uploadButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  removeFile: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'right',
  },
  submitButton: {
    marginTop: 32,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
