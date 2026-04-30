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
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { APPOINTMENT_STATUS } from '@/shared/constants/appointmentStatus';
import { recordService } from '@/features/records/services/record.service';
import { prescriptionService, type PrescriptionItem } from '@/features/prescriptions/services/prescription.service';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input, Card, Button } from '@/components/ui';
import type { ApiSuccessResponse, Appointment, MedicalRecord, User, Medicine } from '@/shared/types';

const TAB_BAR_HEIGHT = 70;

type PatientOption = {
  appointmentId: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  status: string;
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
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PrescriptionItem>>({});
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');

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
          if (appt.status === APPOINTMENT_STATUS.CANCELLED) continue;
          const patient = appt.patientId;
          if (typeof patient !== 'object' || !patient || !('_id' in patient)) {
            console.warn('[AddRecord] Skipping appointment with unpopulated patientId:', appt._id);
            continue;
          }
          const user = patient as User;
          if (seen.has(user._id)) continue;
          seen.add(user._id);
          options.push({
            appointmentId: appt._id,
            patientId: user._id,
            patientName: user.name,
            appointmentDate: appt.appointmentDate,
            status: appt.status,
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
    setMedicineSearchQuery('');
    try {
      const data = await medicineService.getMedicines();
      setAllMedicines(data);
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
    for (let i = 0; i < rxItems.length; i++) {
      const item = rxItems[i];
      if (!item.medicineId || !item.dosage || !item.quantity) {
        Alert.alert('Validation', `Prescription item ${i + 1} is incomplete. Medicine, dosage, and quantity are required.`);
        return;
      }
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('patientId', selectedPatient.patientId);
      formData.append('appointmentId', selectedPatient.appointmentId);
      formData.append('diagnosis', diagnosis.trim());
      if (labFile) {
        const fileUri = labFile.uri;
        const fileName = labFile.name ?? 'lab_report';
        const fileType = labFile.mimeType ?? 'application/octet-stream';
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const file = new Blob([blob], { type: fileType });
        formData.append('labReport', file, fileName);
      }

      const record = await recordService.createRecord(formData);

      if (rxItems.length > 0) {
        try {
          await prescriptionService.createPrescription({
            patientId: selectedPatient.patientId,
            medicalRecordId: record._id,
            items: rxItems,
            notes: '',
          });
          const prescriptionSummary = rxItems
            .map((item) => `${item.medicineName} ${item.dosage} (x${item.quantity})`)
            .join(', ');
          await recordService.updateRecord(record._id, { prescription: prescriptionSummary });
        } catch (prescriptionErr) {
          try { await recordService.deleteRecord(record._id); } catch { }
          throw prescriptionErr;
        }
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
          {/* Patient Selection Card */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Select Patient</Text>
          <View style={[styles.formCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
            {patients.length === 0 ? (
              <View style={styles.hintBox}>
                <Feather name="alert-circle" size={20} color={colors.warning} />
                <View style={styles.hintContent}>
                  <Text style={[styles.hintTitle, { color: colors.text }]}>No patients available</Text>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    You need pending or confirmed appointments before creating medical records. Patients must book appointments first.
                  </Text>
                </View>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientScrollContent}>
                {patients.map((p) => {
                  const isSelected = selectedPatient?.patientId === p.patientId;
                  const statusColor =
                    p.status === APPOINTMENT_STATUS.CONFIRMED ? colors.success :
                    p.status === APPOINTMENT_STATUS.COMPLETED ? colors.textSecondary :
                    p.status === APPOINTMENT_STATUS.PENDING ? colors.warning :
                    colors.textSecondary;
                  const formattedDate = new Date(p.appointmentDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <TouchableOpacity
                      key={p.patientId}
                      style={[
                        styles.patientChip,
                        isSelected
                          ? { backgroundColor: colors.primaryMuted, borderColor: colors.primary }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      onPress={() => setSelectedPatient(p)}
                    >
                      <View style={[styles.chipAvatar, { backgroundColor: isSelected ? colors.primary : colors.textTertiary }]}>
                        <Text style={styles.chipAvatarText}>
                          {p.patientName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.patientChipContent}>
                        <Text
                          style={[
                            styles.patientChipText,
                            { color: isSelected ? colors.primary : colors.text },
                          ]}
                        >
                          {p.patientName}
                        </Text>
                        <View style={styles.patientChipMeta}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.statusText, { color: statusColor }]}>{p.status}</Text>
                          <Text style={[styles.appointmentDate, { color: colors.textTertiary }]}>{formattedDate}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Diagnosis Card */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Diagnosis</Text>
          <View style={[styles.formCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
              placeholder="Enter diagnosis details…"
              placeholderTextColor={colors.inputPlaceholder}
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={2000}
            />
          </View>

          {/* Prescription Items Card */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Prescription</Text>
          <View style={[styles.formCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
            {rxItems.length > 0 && (
              <View style={styles.rxItemList}>
                {rxItems.map((item, idx) => (
                  <View key={idx} style={[styles.rxItemRow, { backgroundColor: colors.primaryMuted }]}>
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
                      <Feather name="x-circle" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.addMedicineButton, { borderColor: colors.primary }]}
              onPress={() => void openMedicinePicker()}
            >
              <Feather name="plus-circle" size={18} color={colors.primary} />
              <Text style={[styles.addMedicineButtonText, { color: colors.primary }]}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {/* Lab Report Card */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Lab Report</Text>
          <View style={[styles.formCard, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => void pickLabReport()}
            >
              <Feather
                name={labFile ? 'file' : 'link'}
                size={18}
                color={labFile ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.uploadButtonText, { color: labFile ? colors.primary : colors.textSecondary }]}>
                {labFile ? labFile.name : 'Upload Lab Report (PDF or Image)'}
              </Text>
            </TouchableOpacity>
            {labFile ? (
              <TouchableOpacity onPress={() => setLabFile(null)} style={styles.removeFileRow}>
                <Text style={[styles.removeFile, { color: colors.error }]}>Remove file</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Submit Button */}
          <Button
            title={rxItems.length > 0 ? 'Create Record + Prescription' : 'Create Record'}
            onPress={() => void handleSubmit()}
            variant="accent"
            size="lg"
            fullWidth
            loading={submitting}
            style={styles.submitButton}
          />
        </ScrollView>

        {/* Medicine Picker Modal */}
        <Modal visible={medicineModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardAvoiding}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.surface, shadowColor: '#1B2A4A' }]}>
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScrollView}>
                  <View style={styles.modalDragHandle} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Select Medicine</Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                    placeholder="Search medicines..."
                    placeholderTextColor={colors.inputPlaceholder}
                    value={medicineSearchQuery}
                    onChangeText={(v) => {
                      setMedicineSearchQuery(v);
                      const q = v.toLowerCase();
                      const filtered = allMedicines.filter((m) => m.name.toLowerCase().includes(q));
                      setMedicines(filtered);
                    }}
                  />
                  {loadingMedicines ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <FlatList
                      data={medicines}
                      keyExtractor={(m) => m._id}
                      style={styles.medicineList}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.medicineRow,
                            { borderBottomColor: colors.divider },
                            item.stockQuantity === 0 && { opacity: 0.4 },
                          ]}
                          onPress={() => {
                            if (item.stockQuantity === 0) return;
                            setNewItem(prev => ({
                              ...prev,
                              medicineId: item._id,
                              medicineName: item.name,
                            }));
                          }}
                          disabled={item.stockQuantity === 0}
                        >
                          <View>
                            <Text style={[styles.medicineName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.medicineDosage, { color: colors.textSecondary }]}>{item.category}</Text>
                          </View>
                          <Text
                            style={[
                              styles.medicineStock,
                              { color: item.stockQuantity === 0 ? colors.error : colors.textSecondary },
                            ]}
                          >
                            {item.stockQuantity === 0 ? 'Out of stock' : `Stock: ${item.stockQuantity}`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}

                  {newItem.medicineId && (
                    <View style={[styles.itemForm, { backgroundColor: colors.surfaceTertiary }]}>
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText }]}
                        placeholder="Dosage (e.g., 500mg)"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={newItem.dosage}
                        onChangeText={(v) => setNewItem(prev => ({ ...prev, dosage: v }))}
                      />
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText, marginTop: 8 }]}
                        placeholder="Quantity"
                        keyboardType="number-pad"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={newItem.quantity ? String(newItem.quantity) : ''}
                        onChangeText={(v) => {
                          const parsed = parseInt(v, 10);
                          setNewItem(prev => ({ ...prev, quantity: Number.isInteger(parsed) && parsed > 0 ? parsed : prev.quantity }));
                        }}
                      />
                      <TextInput
                        style={[styles.inputField, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText, marginTop: 8 }]}
                        placeholder="Instructions (optional)"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={newItem.instructions}
                        onChangeText={(v) => setNewItem(prev => ({ ...prev, instructions: v }))}
                      />
                      <TouchableOpacity style={[styles.confirmAddButton, { backgroundColor: colors.accent }]} onPress={() => void addRxItem()}>
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
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
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
  container: { padding: spacing.md, paddingBottom: TAB_BAR_HEIGHT + spacing.lg },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 20,
  },
  formCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hintContent: { flex: 1 },
  hintTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 14, lineHeight: 20 },
  patientScrollContent: { gap: 8, paddingRight: 8 },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minWidth: 200,
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  patientChipContent: { gap: 4, flex: 1 },
  patientChipText: { fontSize: 14, fontWeight: '600' },
  patientChipMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },
  appointmentDate: { fontSize: 10 },
  textArea: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  rxItemList: { gap: 10, marginBottom: 12 },
  rxItemRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 14,
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
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  addMedicineButtonText: { fontSize: 14, fontWeight: '600' },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  uploadButtonText: { fontSize: 14 },
  removeFileRow: { marginTop: 8, alignItems: 'flex-end' },
  removeFile: { fontSize: 13 },
  submitButton: {
    marginTop: 32,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoiding: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: 12,
    maxHeight: '80%',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputField: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
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
  itemForm: { marginTop: 16, borderRadius: radius.md, padding: 14 },
  confirmAddButton: {
    marginTop: 12,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmAddButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeModalButton: { marginTop: 12, alignItems: 'center', paddingVertical: 12 },
  closeModalButtonText: { fontSize: 15 },
});
