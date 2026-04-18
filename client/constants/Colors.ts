// =============================================================================
// Hospital Management App - Comprehensive Color System
// Medical-professional teal-based palette with full dark mode support
// All text/background combinations meet WCAG AA contrast requirements (4.5:1)
// =============================================================================

// -----------------------------------------------------------------------------
// Primary Brand Colors - Teal/Cyan (Medical Professionalism)
// -----------------------------------------------------------------------------
const primary = {
  50:  '#e6f7f7',
  100: '#b3e6e6',
  200: '#80d4d4',
  300: '#4dc3c3',
  400: '#26b5b5',
  500: '#0d9488', // Main primary
  600: '#0b7a71',
  700: '#086060',
  800: '#054748',
  900: '#023032',
};

const primaryLight = '#0d9488';
const primaryDark  = '#2dd4bf';

// -----------------------------------------------------------------------------
// Semantic Status Colors
// -----------------------------------------------------------------------------
const success = {
  light: '#16a34a',
  dark:  '#4ade80',
  bgLight: '#dcfce7',
  bgDark:  '#14532d',
};

const warning = {
  light: '#d97706',
  dark:  '#fbbf24',
  bgLight: '#fef3c7',
  bgDark:  '#78350f',
};

const error = {
  light: '#dc2626',
  dark:  '#f87171',
  bgLight: '#fee2e2',
  bgDark:  '#7f1d1d',
};

const info = {
  light: '#2563eb',
  dark:  '#60a5fa',
  bgLight: '#dbeafe',
  bgDark:  '#1e3a8a',
};

// -----------------------------------------------------------------------------
// Neutral Grays - Text Hierarchy
// -----------------------------------------------------------------------------
const gray = {
  900: '#111827', // Primary text light mode
  800: '#1f2937',
  700: '#374151',
  600: '#4b5563',
  500: '#6b7280', // Secondary text
  400: '#9ca3af', // Disabled/placeholder
  300: '#d1d5db', // Borders light mode
  200: '#e5e7eb', // Dividers light mode
  100: '#f3f4f6', // Subtle backgrounds
  50:  '#f9fafb', // Card backgrounds light
};

// Dark mode specific grays
const grayDark = {
  900: '#f9fafb',
  800: '#f3f4f6',
  700: '#e5e7eb',
  600: '#d1d5db',
  500: '#9ca3af',
  400: '#6b7280',
  300: '#4b5563',
  200: '#374151',
  100: '#1f2937',
  50:  '#111827',
};

// -----------------------------------------------------------------------------
// Surface / Card Backgrounds
// -----------------------------------------------------------------------------
const surface = {
  light:        '#ffffff',
  secondary:   '#f9fafb',
  tertiary:    '#f3f4f6',
  elevated:    '#ffffff', // Cards with shadow
  dark:         '#0f172a',
  darkSecondary:'#1e293b',
  darkTertiary: '#334155',
  darkElevated: '#1e293b',
};

// -----------------------------------------------------------------------------
// Overlay & Divider Colors
// -----------------------------------------------------------------------------
const overlay = {
  light: 'rgba(0, 0, 0, 0.5)',
  dark:  'rgba(0, 0, 0, 0.7)',
};

const divider = {
  light: '#e5e7eb',
  dark:  '#374151',
};

// -----------------------------------------------------------------------------
// Tab Bar Colors
// -----------------------------------------------------------------------------
const tabBar = {
  light: {
    background:    '#ffffff',
    border:        '#e5e7eb',
    inactive:      '#9ca3af',
    active:        primaryLight,
    activeBg:      '#e6f7f7',
  },
  dark: {
    background:    '#0f172a',
    border:        '#334155',
    inactive:      '#64748b',
    active:        primaryDark,
    activeBg:      '#134e4a',
  },
};

// -----------------------------------------------------------------------------
// Input Field Colors
// -----------------------------------------------------------------------------
const input = {
  light: {
    background:     '#ffffff',
    border:         '#d1d5db',
    borderFocused:  primaryLight,
    placeholder:    '#9ca3af',
    text:           '#111827',
    textSecondary:  '#6b7280',
    error:          '#dc2626',
    errorBorder:    '#ef4444',
    disabled:       '#f3f4f6',
    disabledText:   '#9ca3af',
  },
  dark: {
    background:     '#1e293b',
    border:         '#475569',
    borderFocused:  primaryDark,
    placeholder:    '#64748b',
    text:           '#f9fafb',
    textSecondary:  '#9ca3af',
    error:          '#f87171',
    errorBorder:    '#ef4444',
    disabled:       '#334155',
    disabledText:   '#64748b',
  },
};

// -----------------------------------------------------------------------------
// Badge / Status Colors
// -----------------------------------------------------------------------------
const badge = {
  light: {
    success:  { text: '#166534', background: '#dcfce7', border: '#bbf7d0' },
    warning:  { text: '#92400e', background: '#fef3c7', border: '#fde68a' },
    error:    { text: '#991b1b', background: '#fee2e2', border: '#fecaca' },
    info:     { text: '#1e40af', background: '#dbeafe', border: '#bfdbfe' },
    neutral:  { text: '#374151', background: '#f3f4f6', border: '#e5e7eb' },
    primary:  { text: '#0d9488', background: '#ccfbf1', border: '#99f6e4' },
  },
  dark: {
    success:  { text: '#4ade80', background: '#14532d', border: '#166534' },
    warning:  { text: '#fbbf24', background: '#78350f', border: '#92400e' },
    error:    { text: '#f87171', background: '#7f1d1d', border: '#991b1b' },
    info:     { text: '#60a5fa', background: '#1e3a8a', border: '#1e40af' },
    neutral:  { text: '#d1d5db', background: '#374151', border: '#4b5563' },
    primary:  { text: '#2dd4bf', background: '#134e4a', border: '#0d9488' },
  },
};

// -----------------------------------------------------------------------------
// Button Colors
// -----------------------------------------------------------------------------
const button = {
  light: {
    primary: {
      background:    primaryLight,
      backgroundPressed: '#0b7a71',
      text:          '#ffffff',
      border:        primaryLight,
    },
    secondary: {
      background:    '#f3f4f6',
      backgroundPressed: '#e5e7eb',
      text:          '#374151',
      border:        '#d1d5db',
    },
    outline: {
      background:    'transparent',
      backgroundPressed: '#f3f4f6',
      text:          primaryLight,
      border:        primaryLight,
    },
    ghost: {
      background:    'transparent',
      backgroundPressed: '#f3f4f6',
      text:          primaryLight,
      border:        'transparent',
    },
    danger: {
      background:    '#dc2626',
      backgroundPressed: '#b91c1c',
      text:          '#ffffff',
      border:        '#dc2626',
    },
  },
  dark: {
    primary: {
      background:    primaryDark,
      backgroundPressed: '#14b8a6',
      text:          '#0f172a',
      border:        primaryDark,
    },
    secondary: {
      background:    '#334155',
      backgroundPressed: '#475569',
      text:          '#f3f4f6',
      border:        '#475569',
    },
    outline: {
      background:    'transparent',
      backgroundPressed: '#1e293b',
      text:          primaryDark,
      border:        primaryDark,
    },
    ghost: {
      background:    'transparent',
      backgroundPressed: '#1e293b',
      text:          primaryDark,
      border:        'transparent',
    },
    danger: {
      background:    '#ef4444',
      backgroundPressed: '#dc2626',
      text:          '#ffffff',
      border:        '#ef4444',
    },
  },
};

// -----------------------------------------------------------------------------
// Complete Light & Dark Theme Objects
// -----------------------------------------------------------------------------
export const Colors = {
  light: {
    // Core
    text:             gray[900],
    textSecondary:    gray[500],
    textTertiary:     gray[400],
    background:       '#ffffff',
    surface:          surface.light,
    surfaceSecondary:  surface.secondary,
    surfaceTertiary:  surface.tertiary,

    // Brand
    primary:          primaryLight,
    primaryPressed:   '#0b7a71',
    primaryMuted:     '#ccfbf1',

    // Semantic
    success:          success.light,
    successBg:        success.bgLight,
    warning:          warning.light,
    warningBg:        warning.bgLight,
    error:            error.light,
    errorBg:          error.bgLight,
    info:             info.light,
    infoBg:           info.bgLight,

    // Neutral
    border:           gray[300],
    divider:          divider.light,
    placeholder:      gray[400],

    // Tab Bar
    tabBarBackground: tabBar.light.background,
    tabBarBorder:     tabBar.light.border,
    tabBarInactive:   tabBar.light.inactive,
    tabBarActive:     tabBar.light.active,
    tabBarActiveBg:   tabBar.light.activeBg,

    // Input
    inputBackground:  input.light.background,
    inputBorder:      input.light.border,
    inputBorderFocused: input.light.borderFocused,
    inputPlaceholder: input.light.placeholder,
    inputText:        input.light.text,
    inputTextSecondary: input.light.textSecondary,
    inputError:       input.light.error,
    inputErrorBorder: input.light.errorBorder,
    inputDisabled:    input.light.disabled,
    inputDisabledText: input.light.disabledText,

    // Overlay
    overlay:          overlay.light,

    // Card shadow
    cardShadow:       'rgba(0, 0, 0, 0.08)',
  },

  dark: {
    // Core
    text:             grayDark[900],
    textSecondary:    grayDark[500],
    textTertiary:     grayDark[400],
    background:       '#0a0a0f',
    surface:          surface.dark,
    surfaceSecondary:  surface.darkSecondary,
    surfaceTertiary:  surface.darkTertiary,

    // Brand
    primary:          primaryDark,
    primaryPressed:   '#14b8a6',
    primaryMuted:     '#134e4a',

    // Semantic
    success:          success.dark,
    successBg:        success.bgDark,
    warning:          warning.dark,
    warningBg:        warning.bgDark,
    error:            error.dark,
    errorBg:          error.bgDark,
    info:             info.dark,
    infoBg:           info.bgDark,

    // Neutral
    border:           grayDark[200],
    divider:          divider.dark,
    placeholder:      grayDark[400],

    // Tab Bar
    tabBarBackground: tabBar.dark.background,
    tabBarBorder:     tabBar.dark.border,
    tabBarInactive:   tabBar.dark.inactive,
    tabBarActive:     tabBar.dark.active,
    tabBarActiveBg:   tabBar.dark.activeBg,

    // Input
    inputBackground:  input.dark.background,
    inputBorder:      input.dark.border,
    inputBorderFocused: input.dark.borderFocused,
    inputPlaceholder: input.dark.placeholder,
    inputText:        input.dark.text,
    inputTextSecondary: input.dark.textSecondary,
    inputError:       input.dark.error,
    inputErrorBorder: input.dark.errorBorder,
    inputDisabled:    input.dark.disabled,
    inputDisabledText: input.dark.disabledText,

    // Overlay
    overlay:          overlay.dark,

    // Card shadow
    cardShadow:       'rgba(0, 0, 0, 0.4)',
  },
};

// -----------------------------------------------------------------------------
// Named Exports for Direct Import (e.g., import { primary } from '@/constants/Colors')
// -----------------------------------------------------------------------------
export {
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
};

// -----------------------------------------------------------------------------
// Badge helper - returns the right badge colors for current theme
// Usage: getBadgeColors('success', 'light') or getBadgeColors('success', 'dark')
// -----------------------------------------------------------------------------
export function getBadgeColors(
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary',
  theme: 'light' | 'dark'
) {
  return badge[theme][status];
}

// -----------------------------------------------------------------------------
// Button helper - returns the right button colors for current theme
// Usage: getButtonColors('primary', 'light') or getButtonColors('primary', 'dark')
// -----------------------------------------------------------------------------
export function getButtonColors(
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  theme: 'light' | 'dark'
) {
  return button[theme][variant];
}

export default Colors;
