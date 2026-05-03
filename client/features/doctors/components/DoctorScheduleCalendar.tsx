/**
 * DoctorScheduleCalendar — date picker + time slot grid for available appointment slots.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { doctorScheduleService } from '../services/doctorSchedule.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, typography } from '@/constants/ThemeTokens';

interface DoctorScheduleCalendarProps {
  doctorId: string;
  onSlotSelect: (date: string, time: string) => void;
}

interface DaySlot {
  date: Date;
  dateStr: string;
  label: string;
}

function buildWeekDays(): DaySlot[] {
  const days: DaySlot[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    days.push({ date: d, dateStr, label });
  }
  return days;
}

export function DoctorScheduleCalendar({ doctorId, onSlotSelect }: DoctorScheduleCalendarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const weekDays = useMemo(() => buildWeekDays(), []);
  const [selectedDate, setSelectedDate] = useState<string>(weekDays[0].dateStr);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const fetchSlots = useCallback(async (dateStr: string) => {
    setLoading(true);
    setReason(null);
    setSlots([]);
    try {
      const result = await doctorScheduleService.getAvailableSlots(doctorId, dateStr);
      setSlots(result.slots.map((s) => s.time));
      setReason(result.reason ?? null);
    } catch {
      setReason('Failed to load slots.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const handleDateSelect = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
  }, []);

  const handleSlotSelect = useCallback((time: string) => {
    onSlotSelect(selectedDate, time);
  }, [selectedDate, onSlotSelect]);

  return (
    <View style={styles.container}>
      {/* Date row */}
      <View style={styles.dateRow}>
        <Feather name="calendar" size={16} color={theme.textSecondary} style={{ marginRight: spacing.xs }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {weekDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            return (
              <TouchableOpacity
                key={day.dateStr}
                style={[
                  styles.dateButton,
                  { backgroundColor: isSelected ? theme.primary : theme.surfaceTertiary },
                ]}
                onPress={() => handleDateSelect(day.dateStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateText,
                    { color: isSelected ? '#fff' : theme.textSecondary },
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Slots grid */}
      <View style={styles.slotsContainer}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
        ) : slots.length === 0 ? (
          <Text style={[styles.noSlots, { color: theme.textTertiary }]}>
            {reason ?? 'No available slots for this date.'}
          </Text>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.slotButton, { backgroundColor: theme.surfaceTertiary, borderColor: theme.border }]}
                onPress={() => handleSlotSelect(time)}
                activeOpacity={0.7}
              >
                <Text style={[styles.slotText, { color: theme.text }]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  dateButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  slotsContainer: {
    minHeight: 60,
    justifyContent: 'center',
  },
  loader: {
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  noSlots: {
    fontSize: typography.sm,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotButton: {
    width: 80,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  slotText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
});