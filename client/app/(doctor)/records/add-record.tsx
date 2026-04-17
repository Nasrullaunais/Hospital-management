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
  Modal,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { recordService } from '@/features/records/services/record.service';
import { prescriptionService, type PrescriptionItem } from '@/features/prescriptions/services/prescription.service';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import type { ApiSuccessResponse, Appointment, User } from '@/shared/types';

type PatientOption = {
  appointmentId: string;
  patientId: string;
  patientName: string;
};

type MedicineOption = {
  _id: string;
  name: string;
  stockQuantity: number;
  dosage: string;
};

export default function AddRecordScreen() {
  const router = useRouter();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [labFile, setLabFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Prescription items state
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PrescriptionItem>>({});

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

  const openMedicinePicker = async () => {
    setLoadingMedicines(true);
    try {
      const data = await medicineService.getMedicines();
      setMedicines(data);
      setMedicineModalOpen(true);
    } catch {
      Alert.alert('Error', 'Failed to load medicines.');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const addRxItem = () => {
    if (!newItem.medicineId || !newItem.dosage || !newItem.quantity) return;
    setRxItems(prev => [...prev, newItem as PrescriptionItem]);
    setNewItem({});
    setMedicineModalOpen(false);
  };

  const removeRxItem = (index: number) => {
    setRxItems(prev => prev.filter((_, i) => i !== index));
  };

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
      if (labFile) {
        formData.append('labReport', {
          uri: labFile.uri,
          name: labFile.name,
          type: labFile.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }

      const record = await recordService.createRecord(formData);

      // Create prescription if items exist
      if (rxItems.length > 0) {
        await prescriptionService.createPrescription({
          patientId: selectedPatient.patientId,
          medicalRecordId: (record as any)._id,
          items: rxItems,
          notes: '',
        });
      }

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

        {/* Prescription Items */}
        <Text style={styles.label}>Prescription Items</Text>
        {rxItems.length > 0 && (
          <View style={styles.rxItemList}>
            {rxItems.map((item, idx) => (
              <View key={idx} style={styles.rxItemRow}>
                <View style={styles.rxItemInfo}>
                  <Text style={styles.rxItemName}>{item.medicineName}</Text>
                  <Text style={styles.rxItemDetail}>{item.dosage} — Qty: {item.quantity}</Text>
                  {item.instructions && <Text style={styles.rxItemInstructions}>{item.instructions}</Text>}
                </View>
                <TouchableOpacity onPress={() => removeRxItem(idx)}>
                  <Text style={styles.removeItem}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.addMedicineButton} onPress={() => void openMedicinePicker()}>
          <Text style={styles.addMedicineButtonText}>+ Add Medicine</Text>
        </TouchableOpacity>

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
            <Text style={styles.submitButtonText}>
              {rxItems.length > 0 ? 'Create Record + Prescription' : 'Create Record'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Medicine Picker Modal */}
      <Modal visible={medicineModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Medicine</Text>
            {loadingMedicines ? (
              <ActivityIndicator size="large" color="#2563EB" />
            ) : (
              <FlatList
                data={medicines}
                keyExtractor={(m) => m._id}
                style={styles.medicineList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.medicineRow}
                    onPress={() => {
                      setNewItem(prev => ({
                        ...prev,
                        medicineId: item._id,
                        medicineName: item.name,
                        dosage: item.dosage || '',
                      }));
                    }}
                  >
                    <Text style={styles.medicineName}>{item.name}</Text>
                    <Text style={styles.medicineStock}>Stock: {item.stockQuantity}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {newItem.medicineId && (
              <View style={styles.itemForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Dosage (e.g., 500mg)"
                  value={newItem.dosage}
                  onChangeText={(v) => setNewItem(prev => ({ ...prev, dosage: v }))}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Quantity"
                  keyboardType="number-pad"
                  value={newItem.quantity ? String(newItem.quantity) : ''}
                  onChangeText={(v) => setNewItem(prev => ({ ...prev, quantity: parseInt(v, 10) || 0 }))}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Instructions (optional)"
                  value={newItem.instructions}
                  onChangeText={(v) => setNewItem(prev => ({ ...prev, instructions: v }))}
                />
                <TouchableOpacity style={styles.confirmAddButton} onPress={() => void addRxItem()}>
                  <Text style={styles.confirmAddButtonText}>Add to Prescription</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => { setMedicineModalOpen(false); setNewItem({}); }}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 15 },
  container: { padding: 20, paddingBottom: 48 },
  label: {
    fontSize: 13, fontWeight: '600', color: '#374151',
    marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  hint: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  patientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  patientChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#FFF',
  },
  patientChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  patientChipText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  patientChipTextSelected: { color: '#2563EB', fontWeight: '600' },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827',
  },
  multiline: { minHeight: 100 },
  rxItemList: { gap: 8, marginBottom: 8 },
  rxItemRow: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center',
  },
  rxItemInfo: { flex: 1 },
  rxItemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rxItemDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  rxItemInstructions: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
  removeItem: { color: '#EF4444', fontSize: 18, paddingHorizontal: 8 },
  addMedicineButton: {
    borderWidth: 1.5, borderColor: '#2563EB', borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  addMedicineButtonText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  uploadButton: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#D1D5DB',
    borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  uploadButtonText: { color: '#6B7280', fontSize: 14 },
  removeFile: { color: '#EF4444', fontSize: 13, marginTop: 6, textAlign: 'right' },
  submitButton: {
    marginTop: 32, backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  medicineList: { maxHeight: 300 },
  medicineRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  medicineName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  medicineStock: { fontSize: 13, color: '#6B7280' },
  itemForm: { marginTop: 16 },
  confirmAddButton: {
    marginTop: 12, backgroundColor: '#2563EB', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmAddButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  closeModalButton: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  closeModalButtonText: { color: '#6B7280', fontSize: 15 },
});
