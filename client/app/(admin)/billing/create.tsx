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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  invoiceService,
  formatCurrency,
} from '@/features/billing/services/invoice.service';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { apiClient } from '@/shared/api/client';
import type { InvoiceItem, InvoiceItemCategory, User, ApiSuccessResponse, BillingSuggestion } from '@/shared/types';

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

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Patient search
  const [patientQuery, setPatientQuery] = useState('');
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setPatients(res.data.data);
      setShowDropdown(res.data.data.length > 0);
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

  const handleAddItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Computed Totals ────────────────────────────────────────────────────────

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  const discountValue = parseFloat(discount) || 0;
  const grandTotal = Math.max(0, subtotal - discountValue);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: { patientId?: string; items?: string } = {};

    if (!selectedPatient) {
      newErrors.patientId = 'Please select a patient';
    }

    const hasInvalidItem = items.some(
      (item) => !item.description.trim() || item.unitPrice <= 0,
    );
    if (hasInvalidItem) {
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
      const payload = {
        patientId: selectedPatient!._id,
        items: items.map((item) => ({
          ...item,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
        })),
        appointmentId: appointmentId.trim() || undefined,
        discount: discountValue > 0 ? discountValue : undefined,
        notes: notes.trim() || undefined,
      };

      await invoiceService.createInvoice(payload);
      Alert.alert('Success', 'Invoice created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          Create New Invoice
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg }}>
          Generate a new invoice for a patient.
        </Text>

        {/* ── Patient Section ────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
            ...shadows.card,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: spacing.md,
            }}
          >
            PATIENT
          </Text>

          {selectedPatient ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 15, color: colors.text }}>
                  {selectedPatient.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {selectedPatient.email} · ID: {selectedPatient._id.slice(-6)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClearPatient} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ position: 'relative', zIndex: 10 }}>
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
                <View style={{ position: 'absolute', top: 80, left: 0, right: 0, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, ...shadows.modal, maxHeight: 200, zIndex: 100 }}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {patients.map((item) => (
                      <TouchableOpacity key={item._id} onPress={() => handleSelectPatient(item)} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                        <Text style={{ fontWeight: '500', fontSize: 15, color: colors.text }}>{item.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{item.email}</Text>
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
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.md,
              ...shadows.card,
              borderLeftWidth: 4,
              borderLeftColor: colors.info,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Feather name="zap" size={16} color={colors.info} style={{ marginRight: spacing.sm }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.info, textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
                SUGGESTED CHARGES
              </Text>
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
                  key={index}
                  onPress={() => handleToggleSuggestion(index)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: isChecked ? colors.surfaceSecondary : 'transparent',
                    borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                    borderBottomColor: colors.divider,
                  }}
                >
                  <Feather
                    name={isChecked ? 'check-square' : 'square'}
                    size={18}
                    color={isChecked ? colors.primary : colors.textTertiary}
                    style={{ marginRight: spacing.sm }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }} numberOfLines={1}>
                      {suggestion.description}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <View style={{
                        backgroundColor: catColor + '20',
                        paddingHorizontal: spacing.xs,
                        paddingVertical: 1,
                        borderRadius: radius.xs,
                        marginRight: spacing.sm,
                      }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: catColor }}>
                          {suggestion.category.replace('_', ' ')}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                        {suggestion.date ? new Date(suggestion.date).toLocaleDateString() : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {suggestion.unitPrice > 0 ? formatCurrency(suggestion.unitPrice * suggestion.quantity) : '\u2014'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={handleAddSelectedSuggestions}
              activeOpacity={0.8}
              style={{
                marginTop: spacing.md,
                backgroundColor: colors.info,
                borderRadius: radius.md,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Feather name="plus-circle" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                Add {checkedSuggestions.size} Selected to Invoice
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show loading indicator */}
        {selectedPatient && suggestionsLoading && suggestions.length === 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="small" color={colors.info} style={{ marginRight: spacing.sm }} />
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Looking for suggested charges...</Text>
          </View>
        )}

        {/* Show empty state */}
        {selectedPatient && !suggestionsLoading && suggestions.length === 0 && !suggestionsError && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.md,
              marginBottom: spacing.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Feather name="info" size={14} color={colors.textTertiary} style={{ marginRight: spacing.sm }} />
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>
              No unbilled items found. Add charges manually below.
            </Text>
          </View>
        )}

        {/* ── Line Items Section ─────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
            ...shadows.card,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              INVOICE ITEMS
            </Text>
            <TouchableOpacity
              onPress={handleAddItem}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                Add Item
              </Text>
            </TouchableOpacity>
          </View>

          {errors.items && (
            <Text style={{ fontSize: 12, color: colors.error, marginBottom: spacing.sm }}>
              {errors.items}
            </Text>
          )}

          {items.map((item, index) => (
            <View
              key={index}
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {/* Item header with remove */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary }}>
                  ITEM {index + 1}
                </Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveItem(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="trash-2" size={14} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Description */}
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={labelStyles(colors.textSecondary)}>DESCRIPTION</Text>
                <TextInput
                  style={inputStyles(colors)}
                  value={item.description}
                  onChangeText={(v) => handleItemChange(index, 'description', v)}
                  placeholder="e.g. Consultation Fee"
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>

              {/* Category + Quantity + Unit Price row */}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {/* Category */}
                <View style={{ flex: 2 }}>
                  <Text style={labelStyles(colors.textSecondary)}>CATEGORY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                      {ITEM_CATEGORIES.map((cat) => {
                        const isActive = item.category === cat.value;
                        return (
                          <TouchableOpacity
                            key={cat.value}
                            onPress={() => handleItemChange(index, 'category', cat.value)}
                            style={{
                              borderRadius: radius.xs,
                              paddingHorizontal: spacing.sm,
                              paddingVertical: spacing.xs,
                              backgroundColor: isActive ? colors.primary : colors.surface,
                              borderWidth: 1,
                              borderColor: isActive ? colors.primary : colors.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: isActive ? '#fff' : colors.textSecondary,
                              }}
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

              {/* Quantity & Unit Price */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                <View style={{ flex: 1 }}>
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
                <View style={{ flex: 2 }}>
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
                <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  <Text style={labelStyles(colors.textSecondary)}>TOTAL</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                    {formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* Running total */}
          <View
            style={{
              marginTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.divider,
              paddingTop: spacing.md,
            }}
          >
            <Row label="Subtotal" value={formatCurrency(subtotal)} color={colors} />
            <Row label="Discount" value={`- ${formatCurrency(discountValue)}`} color={colors} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: 2,
                borderTopColor: colors.text,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>
                Grand Total
              </Text>
              <Text style={{ fontWeight: '700', fontSize: 18, color: colors.accent }}>
                {formatCurrency(grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Discount & Notes ───────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            marginBottom: spacing.md,
            ...shadows.card,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: spacing.md,
            }}
          >
            ADDITIONAL
          </Text>

          <Input
            label="Discount (Optional)"
            placeholder="0.00"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            leftIcon={<Feather name="percent" size={16} color={colors.textTertiary} />}
          />

          <View style={{ marginBottom: spacing.md }}>
            <Text style={labelStyles(colors.textSecondary)}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={{
                ...inputStyles(colors),
                minHeight: 80,
                textAlignVertical: 'top',
                paddingTop: spacing.sm,
              }}
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
          style={{ marginTop: spacing.lg }}
        />

        <Button
          title="Cancel"
          variant="outline"
          size="md"
          fullWidth
          onPress={() => router.back()}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
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
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
      }}
    >
      <Text style={{ fontSize: 14, color: color.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: color.text }}>{value}</Text>
    </View>
  );
}

// ── Style Helpers ──────────────────────────────────────────────────────────────

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
