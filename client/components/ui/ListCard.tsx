import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { spacing, shadows } from '@/constants/ThemeTokens';
import { Badge, BadgeVariant } from './Badge';

interface ListCardProps {
  title: string;
  subtitle?: string;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  badge?: {
    label: string;
    variant?: BadgeVariant;
  };
  onPress?: () => void;
  style?: ViewStyle;
  footer?: React.ReactNode;
}

export function ListCard({
  title,
  subtitle,
  leftContent,
  rightContent,
  badge,
  onPress,
  style,
  footer,
}: ListCardProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.mainRow}>
        {leftContent && <View style={styles.leftContent}>{leftContent}</View>}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {badge && (
          <Badge label={badge.label} variant={badge.variant} />
        )}
        {rightContent && (
          <View style={styles.rightContent}>{rightContent}</View>
        )}
      </View>
      {footer && (
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.divider },
          ]}
        >
          {footer}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

// Avatar component for use with ListCard's leftContent
interface AvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
}

export function Avatar({
  name,
  size = 48,
  backgroundColor,
}: AvatarProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { fontSize: size * 0.35 },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const listCardRadius = 16;

const styles = StyleSheet.create({
  card: {
    borderRadius: listCardRadius,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  leftContent: {},
  rightContent: {},
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },
});
