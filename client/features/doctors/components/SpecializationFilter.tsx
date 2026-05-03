/**
 * SpecializationFilter — horizontal scrollable chip bar for filtering doctors by specialization.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { doctorService } from '../services/doctor.service';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, typography } from '@/constants/ThemeTokens';

interface SpecializationFilterProps {
  selected: string | null;
  onFilterChange: (spec: string | null) => void;
}

export function SpecializationFilter({ selected, onFilterChange }: SpecializationFilterProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const specs = await doctorService.getSpecializations();
        if (!cancelled) setSpecializations(specs);
      } catch {
        // silently fail — filter just won't show any specs
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePress = useCallback((spec: string | null) => {
    onFilterChange(spec);
  }, [onFilterChange]);

  if (loading || specializations.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.chip,
          { backgroundColor: selected === null ? theme.primary : theme.surfaceTertiary },
        ]}
        onPress={() => handlePress(null)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            { color: selected === null ? '#fff' : theme.textSecondary },
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      {specializations.map((spec) => {
        const isSelected = selected === spec;
        return (
          <TouchableOpacity
            key={spec}
            style={[
              styles.chip,
              { backgroundColor: isSelected ? theme.primary : theme.surfaceTertiary },
            ]}
            onPress={() => handlePress(spec)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? '#fff' : theme.textSecondary },
              ]}
            >
              {spec}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
});