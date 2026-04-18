import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, getBadgeColors } from '@/constants/Colors';
import { spacing, radius } from '@/constants/ThemeTokens';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  variant = 'neutral',
  style,
  size = 'sm',
}: BadgeProps) {
  const theme = useColorScheme() ?? 'light';
  const badgeColors = getBadgeColors(variant, theme);
  const colors = Colors[theme];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColors.background,
          borderColor: badgeColors.border,
          paddingVertical: size === 'sm' ? spacing.xs : spacing.sm,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: badgeColors.text,
            fontSize: size === 'sm' ? 11 : 13,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
