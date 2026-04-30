import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { spacing, radius } from '@/constants/ThemeTokens';

interface InputProps extends Omit<TextInputProps, 'style' | 'disabled'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  disabled,
  ...textInputProps
}: InputProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.inputErrorBorder;
    if (isFocused) return colors.inputBorderFocused;
    return colors.inputBorder;
  };

  const getBorderWidth = () => {
    if (isFocused) return 2;
    return 1.5;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: disabled ? colors.inputDisabled : colors.inputBackground,
            borderColor: getBorderColor(),
            borderWidth: getBorderWidth(),
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              color: disabled ? colors.inputDisabledText : colors.inputText,
            },
          ]}
          placeholderTextColor={colors.inputPlaceholder}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          editable={!disabled}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.inputError }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
