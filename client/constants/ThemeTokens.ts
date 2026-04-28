// =============================================================================
// Design Tokens - Spacing, Radius, Shadows, Typography
// These complement the color system in Colors.ts
// =============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  button: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const animations = {
  springDefault: { type: 'spring' as const, damping: 20, stiffness: 200, mass: 0.5 },
  springGentle: { type: 'spring' as const, damping: 25, stiffness: 170, mass: 0.4 },
  springBouncy: { type: 'spring' as const, damping: 12, stiffness: 200, mass: 0.6 },
  timingFast: { type: 'timing' as const, duration: 200 },
  timingNormal: { type: 'timing' as const, duration: 300 },
  timingSlow: { type: 'timing' as const, duration: 500 },
  pressScale: { from: 0.97, to: 1 },
  fadeIn: { from: 0, to: 1 },
  slideUp: { from: 24, to: 0 },
} as const;

// Re-export Colors for convenience
export { Colors, getBadgeColors, getButtonColors } from '@/constants/Colors';
export type { TextProps, ViewProps } from '@/components/Themed';
