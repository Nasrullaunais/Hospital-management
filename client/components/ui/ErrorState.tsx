import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { spacing } from '@/constants/ThemeTokens';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
  fullScreen = true,
}: ErrorStateProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <SymbolView
        name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
        tintColor={colors.error}
        size={64}
      />
      <Text style={[styles.title, { color: colors.text }]}>
        Oops!
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="primary"
          style={styles.button}
        />
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  fullScreen: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.md,
  },
});
