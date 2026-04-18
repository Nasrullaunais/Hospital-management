import { Text as DefaultText, View as DefaultView } from 'react-native';
import { useColorScheme } from './useColorScheme';
import Colors, {
  primary,
  primaryLight,
  primaryDark,
  success,
  warning,
  error,
  info,
  gray,
  grayDark,
  surface,
  overlay,
  divider,
  tabBar,
  input,
  badge,
  button,
  getBadgeColors,
  getButtonColors,
} from '@/constants/Colors';

// -----------------------------------------------------------------------------
// Theme Color Hook
// -----------------------------------------------------------------------------
type ColorName = keyof typeof Colors.light;
type Theme = 'light' | 'dark';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName?: ColorName
): string {
  const theme = useColorScheme() as Theme;
  const colorFromProps = props[theme];
  if (colorFromProps !== undefined) {
    return colorFromProps;
  }
  if (colorName && Colors[theme][colorName] !== undefined) {
    return Colors[theme][colorName];
  }
  return Colors[theme].text;
}

// -----------------------------------------------------------------------------
// Theme-aware Text Component
// -----------------------------------------------------------------------------
type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

// -----------------------------------------------------------------------------
// Theme-aware View Component
// -----------------------------------------------------------------------------
export type ViewProps = ThemeProps & DefaultView['props'];

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background'
  );
  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

// -----------------------------------------------------------------------------
// Re-export all named color exports for convenience
// -----------------------------------------------------------------------------
export {
  Colors,
  primary,
  primaryLight,
  primaryDark,
  success,
  warning,
  error,
  info,
  gray,
  grayDark,
  surface,
  overlay,
  divider,
  tabBar,
  input,
  badge,
  button,
  getBadgeColors,
  getButtonColors,
};
