import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { recordService } from '@/features/records/services/record.service';
import { prescriptionService, type PrescriptionItem } from '@/features/prescriptions/services/prescription.service';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import type { ApiSuccessResponse, Appointment, User, Medicine } from '@/shared/types';

type PatientOption = {
  appointmentId: string;
  patientId: string;
  patientName: string;
};

export default function AddRecordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [labFile, setLabFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PrescriptionItem>>({});

  // Focus state for inputs
  const [diagnosisFocused, setDiagnosisFocused] = useState(false);

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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading patients…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Patient Selector */}
        <Text style={[styles.label, { color: colors.text }]}>Patient *</Text>
        {patients.length === 0 ? (
          <View style={[styles.hintBox, { backgroundColor: colors.surfaceTertiary }]}>
            <SymbolView name={{ ios: 'info.circle', android: 'info', web: 'info' }} tintColor={colors.textSecondary} size={16} />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>No confirmed/completed appointments found.</Text>
          </View>
        ) : (
          <View style={styles.patientList}>
            {patients.map((p) => (
              <TouchableOpacity
                key={p.patientId}
                style={[
                  styles.patientChip,
                  selectedPatient?.patientId === p.patientId
                    ? { backgroundColor: colors.primaryMuted, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setSelectedPatient(p)}
              >
                <SymbolView
                  name={{ ios: 'person', android: 'person', web: 'person' }}
                  tintColor={selectedPatient?.patientId === p.patientId ? colors.primary : colors.textSecondary}
                  size={14}
                />
                <Text
                  style={[
                    styles.patientChipText,
                    { color: selectedPatient?.patientId === p.patientId ? colors.primary : colors.text },
                  ]}
                >
                  {p.patientName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Diagnosis */}
        <Text style={[styles.label, { color: colors.text }]}>Diagnosis *</Text>
        <TextInput
          style={[
            styles.input,
            styles.multiline,
            {
              backgroundColor: colors.inputBackground,
              borderColor: diagnosisFocused ? colors.primary : colors.inputBorder,
              color: colors.inputText,
            },
          ]}
          placeholder="Enter diagnosis details…"
          placeholderTextColor={colors.inputPlaceholder}
          value={diagnosis}
          onChangeText={setDiagnosis}
          onFocus={() => setDiagnosisFocused(true)}
          onBlur={() => setDiagnosisFocused(false)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Prescription Items */}
        <Text style={[styles.label, { color: colors.text }]}>Prescription Items</Text>
        {rxItems.length > 0 && (
          <View style={styles.rxItemList}>
            {rxItems.map((item, idx) => (
              <View key={idx} style={[styles.rxItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.rxItemInfo}>
                  <Text style={[styles.rxItemName, { color: colors.text }]}>{item.medicineName}</Text>
                  <Text style={[styles.rxItemDetail, { color: colors.textSecondary }]}>
                    {item.dosage} — Qty: {item.quantity}
                  </Text>
                  {item.instructions && (
                    <Text style={[styles.rxItemInstructions, { color: colors.textTertiary }]}>{item.instructions}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeRxItem(idx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }} tintColor={colors.error} size={22} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.addMedicineButton, { borderColor: colors.primary }]}
          onPress={() => void openMedicinePicker()}
        >
          <SymbolView name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }} tintColor={colors.primary} size={18} />
          <Text style={[styles.addMedicineButtonText, { color: colors.primary }]}>Add Medicine</Text>
        </TouchableOpacity>

        {/* Lab Report Upload */}
        <Text style={[styles.label, { color: colors.text }]}>Lab Report</Text>
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => void pickLabReport()}
        >
          <SymbolView
            name={labFile ? { ios: 'doc.fill', android: 'description', web: 'description' } : { ios: 'link', android: 'link', web: 'link' }}
            tintColor={labFile ? colors.primary : colors.textSecondary}
            size={18}
          />
          <Text style={[styles.uploadButtonText, { color: labFile ? colors.primary : colors.textSecondary }]}>
            {labFile ? `📎 ${labFile.name}` : 'Attach PDF or Image (optional)'}
          </Text>
        </TouchableOpacity>
        {labFile ? (
          <TouchableOpacity onPress={() => setLabFile(null)}>
            <Text style={[styles.removeFile, { color: colors.error }]}>Remove file</Text>
          </TouchableOpacity>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Medicine</Text>
            {loadingMedicines ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <FlatList
                data={medicines}
                keyExtractor={(m) => m._id}
                style={styles.medicineList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.medicineRow, { borderBottomColor: colors.divider }]}
                    onPress={() => {
                      setNewItem(prev => ({
                        ...prev,
                        medicineId: item._id,
                        medicineName: item.name,
                      }));
                    }}
                  >
                    <View>
                      <Text style={[styles.medicineName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.medicineDosage, { color: colors.textSecondary }]}>{item.category}</Text>
                    </View>
                    <Text style={[styles.medicineStock, { color: colors.textSecondary }]}>
                      Stock: {item.stockQuantity}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {newItem.medicineId && (
              <View style={[styles.itemForm, { backgroundColor: colors.surfaceTertiary }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                  placeholder="Dosage (e.g., 500mg)"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newItem.dosage}
                  onChangeText={(v) => setNewItem(prev => ({ ...prev, dosage: v }))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText, marginTop: 8 }]}
                  placeholder="Quantity"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newItem.quantity ? String(newItem.quantity) : ''}
                  onChangeText={(v) => setNewItem(prev => ({ ...prev, quantity: parseInt(v, 10) || 0 }))}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText, marginTop: 8 }]}
                  placeholder="Instructions (optional)"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={newItem.instructions}
                  onChangeText={(v) => setNewItem(prev => ({ ...prev, instructions: v }))}
                />
                <TouchableOpacity style={[styles.confirmAddButton, { backgroundColor: colors.primary }]} onPress={() => void addRxItem()}>
                  <Text style={styles.confirmAddButtonText}>Add to Prescription</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => { setMedicineModalOpen(false); setNewItem({}); }}
            >
              <Text style={[styles.closeModalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15 },
  container: { padding: 20, paddingBottom: 48 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  hint: { fontSize: 14 },
  patientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  patientChipText: { fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 100 },
  rxItemList: { gap: 8, marginBottom: 8 },
  rxItemRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  rxItemInfo: { flex: 1 },
  rxItemName: { fontSize: 15, fontWeight: '600' },
  rxItemDetail: { fontSize: 13, marginTop: 2 },
  rxItemInstructions: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  addMedicineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
  },
  addMedicineButtonText: { fontSize: 14, fontWeight: '600' },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  uploadButtonText: { fontSize: 14 },
  removeFile: { fontSize: 13, marginTop: 6, textAlign: 'right' },
  submitButton: {
    marginTop: 32,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  medicineList: { maxHeight: 300 },
  medicineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  medicineName: { fontSize: 15, fontWeight: '600' },
  medicineDosage: { fontSize: 12, marginTop: 1 },
  medicineStock: { fontSize: 13 },
  itemForm: { marginTop: 16, borderRadius: 12, padding: 14 },
  confirmAddButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmAddButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeModalButton: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  closeModalButtonText: { fontSize: 15 },
});
