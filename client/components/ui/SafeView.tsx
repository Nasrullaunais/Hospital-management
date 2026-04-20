// =============================================================================
// SafeView - Drop-in View replacement that handles Android system insets
// =============================================================================

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

interface SafeViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Override the default background color.
   * Defaults to theme background color.
   */
  backgroundColor?: string;
  /**
   * Enable/disable top inset padding.
   * @default true
   */
  top?: boolean;
  /**
   * Enable/disable bottom inset padding.
   * @default true
   */
  bottom?: boolean;
  /**
   * Apply insets as margin instead of padding.
   * @default false
   */
  insetAsMargin?: boolean;
}

/**
 * SafeView - A drop-in replacement for View that automatically handles
 * Android status bar (top) and navigation bar (bottom) insets.
 *
 * Uses react-native-safe-area-context under the hood, which handles
 * iOS SafeAreaView automatically.
 */
export function SafeView({
  children,
  style,
  backgroundColor,
  top = true,
  bottom = true,
  insetAsMargin = false,
}: SafeViewProps) {
  const insets = useSafeAreaInsets();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const bg = backgroundColor ?? colors.background;

  const wrapperStyle: ViewStyle = {
    ...(insetAsMargin
      ? {
          marginTop: top ? insets.top : 0,
          marginBottom: bottom ? insets.bottom : 0,
        }
      : {
          paddingTop: top ? insets.top : 0,
          paddingBottom: bottom ? insets.bottom : 0,
        }),
  };

  // On iOS, the SafeAreaProvider already handles the outer insets.
  // On Android, we need to manually account for status bar (top) and
  // navigation bar (bottom) via useSafeAreaInsets().
  // The top inset on Android corresponds to the status bar height.
  // The bottom inset on Android corresponds to the navigation bar height
  // when gesture navigation is enabled, or the same when 3-button nav.

  return (
    <View style={[styles.container, { backgroundColor: bg }, wrapperStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeView;
