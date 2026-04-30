import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, getButtonColors } from '@/constants/Colors';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = getButtonColors(variant, theme);

  const sizePresets = {
    sm: { height: 40, fontSize: 13, iconSize: 16 },
    md: { height: 48, fontSize: 15, iconSize: 18 },
    lg: { height: 56, fontSize: 17, iconSize: 20 },
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          height: sizePresets[size].height,
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {icon && (
            <Feather
              name={icon}
              size={sizePresets[size].iconSize}
              color={colors.text}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: colors.text,
                fontSize: sizePresets[size].fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    ...shadows.button,
  },
  fullWidth: {
    width: '100%',
  },
  icon: {
    marginRight: 0,
  },
  text: {
    fontWeight: '600',
  },
});
