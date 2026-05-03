import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  invoiceService,
  formatCurrency,
} from '@/features/billing/services/invoice.service';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import type {
  InvoiceItem,
  InvoiceItemCategory,
  User,
  ApiSuccessResponse,
  BillingSuggestion,
} from '@/shared/types';

const ITEM_CATEGORIES: { value: InvoiceItemCategory; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'lab_test', label: 'Lab Test' },
  { value: 'ward', label: 'Ward' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' },
];

const emptyItem = (): InvoiceItem => ({
  description: '',
  category: 'consultation',
  quantity: 1,
  unitPrice: 0,
});

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BillingCreateFormProps {
  /** Pre-fill patient from route params (e.g., from Ready for Billing dashboard). */
  initialPatient?: User;
  /** Called when invoice is successfully created. */
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingCreateForm({ initialPatient, onSuccess }: BillingCreateFormProps) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Patient search
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<User | null>(initialPatient ?? null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill patient query if initialPatient provided
  useEffect(() => {
    if (initialPatient) {
      setPatientQuery(`${initialPatient.name} (${initialPatient.email})`);
    }
  }, [initialPatient]);

  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([emptyItem()]);

  // Other fields
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [appointmentId, setAppointmentId] = useState('');

  // Submit state
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<{ patientId?: string; items?: string }>({});

  // Suggested charges
  const [suggestions, setSuggestions] = useState<BillingSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<string>>(new Set());
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // ── Patient Search ──────────────────────────────────────────────────────────

  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setPatients([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await apiClient.get<ApiSuccessResponse<User[]>>(
        `${ENDPOINTS.PATIENTS.SEARCH}?q=${encodeURIComponent(query)}`,
      );
      const patients = res.data.data ?? [];
      setPatients(patients);
      setShowDropdown(patients.length > 0);
    } catch {
      setPatients([]);
      setShowDropdown(false);
    } finally {
      setSearching(false);
    }
  }, []);

  const handlePatientQueryChange = (text: string) => {
    setPatientQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPatients(text), 350);
  };

  const handleSelectPatient = (patient: User) => {
    setSelectedPatient(patient);
    setPatientQuery(`${patient.name} (${patient.email})`);
    setShowDropdown(false);
    if (errors.patientId) setErrors({ ...errors, patientId: undefined });
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientQuery('');
    setPatients([]);
    setShowDropdown(false);
  };

  // ── Suggested Charges ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedPatient) {
      setSuggestions([]);
      setCheckedSuggestions(new Set());
      return;
    }

    const fetchSuggestions = async () => {
      setSuggestionsLoading(true);
      setSuggestionsError(null);
      try {
        const result = await invoiceService.getSuggestions(selectedPatient._id);
        setSuggestions(result.suggestions);
        setCheckedSuggestions(new Set(result.suggestions.map((_, i) => i.toString())));
      } catch (err) {
        setSuggestionsError(err instanceof Error ? err.message : 'Failed to load suggestions');
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [selectedPatient]);

  const handleToggleSuggestion = (index: number) => {
    setCheckedSuggestions((prev) => {
      const next = new Set(prev);
      const key = index.toString();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelectedSuggestions = () => {
    const selectedItems: InvoiceItem[] = [];
    checkedSuggestions.forEach((key) => {
      const idx = parseInt(key);
      if (idx < suggestions.length) {
        const s = suggestions[idx];
        selectedItems.push({
          description: s.description,
          category: s.category,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        });
      }
    });

    if (selectedItems.length === 0) return;

    if (items.length === 1 && !items[0].description.trim() && items[0].unitPrice === 0) {
      setItems(selectedItems);
    } else {
      setItems((prev) => [...prev, ...selectedItems]);
    }
  };

  // ── Line Items ─────────────────────────────────────────────────────────────

  const handleItemChange = <K extends keyof InvoiceItem>(
    index: number,
    field: K,
    value: InvoiceItem[K],
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (errors.items) setErrors({ ...errors, items: undefined });
  };

  const handleAddItem = () => setItems((prev) => [...prev, emptyItem()]);

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Computed Totals ────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const discountValue = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountValue);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: { patientId?: string; items?: string } = {};
    if (!selectedPatient) newErrors.patientId = 'Please select a patient';
    if (items.some((item) => !item.description.trim() || item.unitPrice <= 0)) {
      newErrors.items = 'Each item needs a description and valid price';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setValidating(true);
    if (!validate()) {
      setValidating(false);
      return;
    }
    setValidating(false);

    setLoading(true);
    try {
      await invoiceService.createInvoice({
        patientId: selectedPatient!._id,
        items: items.map((item) => ({
          ...item,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
        })),
        appointmentId: appointmentId.trim() || undefined,
        discount: discountValue > 0 ? discountValue : undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', 'Invoice created successfully.', [
        { text: 'OK', onPress: () => {
          onSuccess?.();
          router.back();
        }},
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={[styles.heading, { color: colors.text }]}>Create New Invoice</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          Generate a new invoice for a patient.
        </Text>

        {/* ── Patient Section ────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.card }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PATIENT</Text>

          {selectedPatient ? (
            <View style={[styles.selectedPatientCard, { backgroundColor: colors.primaryMuted }]}>
              <View style={styles.selectedPatientInfo}>
                <Text style={[styles.selectedPatientName, { color: colors.text }]}>
                  {selectedPatient.name}
                </Text>
                <Text style={[styles.selectedPatientDetail, { color: colors.textSecondary }]}>
                  {selectedPatient.email} · ID: {selectedPatient._id.slice(-6)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClearPatient} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchContainer}>
              <Input
                label="Search Patient *"
                placeholder="Type name or email..."
                value={patientQuery}
                onChangeText={handlePatientQueryChange}
                error={errors.patientId}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Feather name="search" size={16} color={colors.textTertiary} />}
                rightIcon={searching ? <Feather name="loader" size={16} color={colors.textTertiary} /> : undefined}
              />
              {showDropdown && patients.length > 0 && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.modal }]}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {patients.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => handleSelectPatient(item)}
                        style={[styles.dropdownItem, { borderBottomColor: colors.divider }]}
                      >
                        <Text style={[styles.dropdownItemName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.dropdownItemEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          <Input
            label="Appointment ID (Optional)"
            placeholder="Enter appointment ID if applicable"
            value={appointmentId}
            onChangeText={setAppointmentId}
            autoCapitalize="none"
          />
        </View>

        {/* ── Suggested Charges ──────────────────────────────────────────── */}
        {selectedPatient && suggestions.length > 0 && (
          <View style={[styles.card, styles.suggestionsCard, { backgroundColor: colors.surface, borderLeftColor: colors.info }]}>
            <View style={styles.suggestionsHeader}>
              <Feather name="zap" size={16} color={colors.info} style={styles.suggestionsIcon} />
              <Text style={[styles.sectionLabel, { color: colors.info, flex: 1 }]}>SUGGESTED CHARGES</Text>
              {suggestionsLoading && <ActivityIndicator size="small" color={colors.info} />}
            </View>

            {suggestions.map((suggestion, index) => {
              const isChecked = checkedSuggestions.has(index.toString());
              const categoryColors: Record<string, string> = {
                consultation: colors.primary,
                medicine: colors.success,
                lab_test: colors.warning,
                ward: colors.info,
                procedure: colors.accent,
                other: colors.textTertiary,
              };
              const catColor = categoryColors[suggestion.category] || colors.textTertiary;

              return (
                <TouchableOpacity
                  key={`suggestion-${suggestion.source}-${suggestion.sourceId}`}
                  onPress={() => handleToggleSuggestion(index)}
                  activeOpacity={0.7}
                  style={[
                    styles.suggestionItem,
                    {
                      backgroundColor: isChecked ? colors.surfaceSecondary : 'transparent',
                      borderBottomColor: colors.divider,
                      borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <Feather
                    name={isChecked ? 'check-square' : 'square'}
                    size={18}
                    color={isChecked ? colors.primary : colors.textTertiary}
                    style={styles.suggestionIcon}
                  />
                  <View style={styles.suggestionContent}>
                    <Text style={[styles.suggestionDesc, { color: colors.text }]} numberOfLines={1}>
                      {suggestion.description}
                    </Text>
                    <View style={styles.suggestionMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                        <Text style={[styles.categoryBadgeText, { color: catColor }]}>
                          {suggestion.category.replace('_', ' ')}
                        </Text>
                      </View>
                      <Text style={[styles.suggestionDate, { color: colors.textTertiary }]}>
                        {suggestion.date ? new Date(suggestion.date).toLocaleDateString() : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.suggestionPrice, { color: colors.text }]}>
                    {suggestion.unitPrice > 0 ? formatCurrency(suggestion.unitPrice * suggestion.quantity) : '\u2014'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={handleAddSelectedSuggestions}
              activeOpacity={0.8}
              style={[styles.addSuggestionsBtn, { backgroundColor: colors.info }]}
            >
              <Feather name="plus-circle" size={16} color="#fff" style={styles.addSuggestionsIcon} />
              <Text style={styles.addSuggestionsText}>Add {checkedSuggestions.size} Selected to Invoice</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedPatient && suggestionsLoading && suggestions.length === 0 && (
          <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.info} style={styles.centerIndicator} />
            <Text style={[styles.centerText, { color: colors.textSecondary }]}>Looking for suggested charges...</Text>
          </View>
        )}

        {selectedPatient && !suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
          <View style={[styles.card, styles.centerCard, { backgroundColor: colors.surface }]}>
            <Feather name="info" size={14} color={colors.textTertiary} style={styles.centerIcon} />
            <Text style={[styles.centerText, { color: colors.textTertiary }]}>No unbilled items found. Add charges manually below.</Text>
          </View>
        )}

        {/* ── Line Items Section ─────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.card }]}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>INVOICE ITEMS</Text>
            <TouchableOpacity onPress={handleAddItem} style={styles.addItemBtn}>
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={[styles.addItemText, { color: colors.primary }]}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {errors.items && (
            <Text style={[styles.errorText, { color: colors.error }]}>{errors.items}</Text>
          )}

          {items.map((item, index) => (
            <View
              key={item._id ?? `item-${item.description || 'new'}-${index}`}
              style={[styles.itemCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={styles.itemHeader}>
                <Text style={[styles.itemLabel, { color: colors.textTertiary }]}>ITEM {index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveItem(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={14} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.itemField}>
                <Text style={labelStyles(colors.textSecondary)}>DESCRIPTION</Text>
                <TextInput
                  style={inputStyles(colors)}
                  value={item.description}
                  onChangeText={(v) => handleItemChange(index, 'description', v)}
                  placeholder="e.g. Consultation Fee"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>

              <View style={styles.itemRow}>
                <View style={styles.categoryWrapper}>
                  <Text style={labelStyles(colors.textSecondary)}>CATEGORY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.categoryRow}>
                      {ITEM_CATEGORIES.map((cat) => {
                        const isActive = item.category === cat.value;
                        return (
                          <TouchableOpacity
                            key={cat.value}
                            onPress={() => handleItemChange(index, 'category', cat.value)}
                            style={[
                              styles.categoryChip,
                              {
                                backgroundColor: isActive ? colors.primary : colors.surface,
                                borderColor: isActive ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryChipText,
                                { color: isActive ? '#fff' : colors.textSecondary },
                              ]}
                            >
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.qtyField}>
                  <Text style={labelStyles(colors.textSecondary)}>QTY</Text>
                  <TextInput
                    style={inputStyles(colors)}
                    value={item.quantity.toString()}
                    onChangeText={(v) => handleItemChange(index, 'quantity', Math.max(1, parseInt(v) || 1))}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                </View>
                <View style={styles.priceField}>
                  <Text style={labelStyles(colors.textSecondary)}>UNIT PRICE (Rs.)</Text>
                  <TextInput
                    style={inputStyles(colors)}
                    value={item.unitPrice > 0 ? item.unitPrice.toString() : ''}
                    onChangeText={(v) => handleItemChange(index, 'unitPrice', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                </View>
                <View style={styles.totalField}>
                  <Text style={labelStyles(colors.textSecondary)}>TOTAL</Text>
                  <Text style={[styles.itemTotal, { color: colors.text }]}>
                    {formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Running total */}
          <View style={[styles.totalsSection, { borderTopColor: colors.divider }]}>
            <Row label="Subtotal" value={formatCurrency(subtotal)} color={colors} />
            <Row label="Discount" value={`- ${formatCurrency(discountValue)}`} color={colors} />
            <View style={styles.grandTotalRow}>
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Grand Total</Text>
              <Text style={[styles.grandTotalValue, { color: colors.accent }]}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* ── Discount & Notes ───────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: colors.surface, ...shadows.card }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ADDITIONAL</Text>

          <Input
            label="Discount (Optional)"
            placeholder="0.00"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            leftIcon={<Feather name="percent" size={16} color={colors.textTertiary} />}
          />

          <View style={styles.notesField}>
            <Text style={labelStyles(colors.textSecondary)}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={[inputStyles(colors), styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes for this invoice..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
            />
          </View>
        </View>

        <Button
          title="Create Invoice"
          variant="accent"
          size="lg"
          fullWidth
          loading={loading}
          onPress={handleSubmit}
          style={styles.createBtn}
        />

        <Button
          title="Cancel"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => router.back()}
          style={styles.cancelBtn}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: ReturnType<typeof Colors>['light' | 'dark'];
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: color.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: color.text }]}>{value}</Text>
    </View>
  );
}

// ── Style Helpers ─────────────────────────────────────────────────────────────

const labelStyles = (secondaryColor: string) => ({
  fontSize: 10,
  fontWeight: '600',
  color: secondaryColor,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
  marginBottom: 4,
});

const inputStyles = (colors: ReturnType<typeof Colors>['light' | 'dark']) => ({
  backgroundColor: colors.inputBackground,
  borderWidth: 1.5,
  borderColor: colors.inputBorder,
  borderRadius: radius.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  fontSize: 14,
  color: colors.inputText,
});

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  heading: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subheading: { fontSize: 14, marginBottom: spacing.lg },

  card: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md,
  },

  selectedPatientCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  selectedPatientInfo: { flex: 1 },
  selectedPatientName: { fontWeight: '600', fontSize: 15 },
  selectedPatientDetail: { fontSize: 12, marginTop: 2 },

  searchContainer: { position: 'relative', zIndex: 10 },
  dropdown: {
    position: 'absolute', top: 80, left: 0, right: 0, borderRadius: radius.md,
    borderWidth: 1, maxHeight: 200, zIndex: 100,
  },
  dropdownItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  dropdownItemName: { fontWeight: '500', fontSize: 15 },
  dropdownItemEmail: { fontSize: 12, marginTop: 1 },

  suggestionsCard: { borderLeftWidth: 4 },
  suggestionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  suggestionsIcon: { marginRight: spacing.sm },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  suggestionIcon: { marginRight: spacing.sm },
  suggestionContent: { flex: 1 },
  suggestionDesc: { fontSize: 13, fontWeight: '500' },
  suggestionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  categoryBadge: { paddingHorizontal: spacing.xs, paddingVertical: 1, borderRadius: radius.xs, marginRight: spacing.sm },
  categoryBadgeText: { fontSize: 10, fontWeight: '600' },
  suggestionDate: { fontSize: 11 },
  suggestionPrice: { fontSize: 14, fontWeight: '600' },

  addSuggestionsBtn: {
    marginTop: spacing.md, borderRadius: radius.md, paddingVertical: spacing.sm,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  addSuggestionsIcon: { marginRight: spacing.xs },
  addSuggestionsText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  centerCard: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  centerIndicator: { marginRight: spacing.sm },
  centerIcon: { marginRight: spacing.sm },
  centerText: { fontSize: 13 },

  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  addItemText: { fontSize: 13, fontWeight: '600' },
  errorText: { fontSize: 12, marginBottom: spacing.sm },

  itemCard: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  itemLabel: { fontSize: 12, fontWeight: '600' },
  itemField: { marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', gap: spacing.sm },
  categoryWrapper: { flex: 2 },
  categoryRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  categoryChip: { borderRadius: radius.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1 },
  categoryChipText: { fontSize: 11, fontWeight: '600' },

  priceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  qtyField: { flex: 1 },
  priceField: { flex: 2 },
  totalField: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' },
  itemTotal: { fontSize: 15, fontWeight: '700', marginTop: 20 },

  totalsSection: { marginTop: spacing.sm, borderTopWidth: 1, paddingTop: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, fontWeight: '600' },
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 2,
  },
  grandTotalLabel: { fontWeight: '700', fontSize: 16 },
  grandTotalValue: { fontWeight: '700', fontSize: 18 },

  notesField: { marginBottom: spacing.md },
  notesInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm },

  createBtn: { marginTop: spacing.lg },
  cancelBtn: { marginTop: spacing.sm },
});