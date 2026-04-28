// =============================================================================
// Hospital Management App - Theme Constants
// Spacing, Border Radius, Typography, and Shadow Scales
// =============================================================================

// -----------------------------------------------------------------------------
// Spacing Scale (in pixels)
// -----------------------------------------------------------------------------
export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export type SpacingKey = keyof typeof spacing;

// Common spacing presets
export const Spacing = {
  xxs:  spacing[1],   // 4
  xs:   spacing[2],   // 8
  sm:   spacing[3],   // 12
  md:   spacing[4],   // 16
  lg:   spacing[5],   // 20
  xl:   spacing[6],   // 24
  xxl:  spacing[8],   // 32
  xxxl: spacing[12],  // 48
} as const;

// -----------------------------------------------------------------------------
// Border Radius Scale (in pixels)
// -----------------------------------------------------------------------------
export const borderRadius = {
  none:  0,
  xs:    6,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  xxl:   24,
  '2xl': 28,
  full:  9999,
} as const;

export type BorderRadiusKey = keyof typeof borderRadius;

// Common radius presets
export const BorderRadius = {
  sm:   borderRadius.sm,   // 8
  md:   borderRadius.md,   // 12
  lg:   borderRadius.lg,   // 16
  xl:   borderRadius.xl,   // 20
  xxl:  borderRadius['2xl'], // 28
  pill: borderRadius.full,  // 9999
} as const;

// -----------------------------------------------------------------------------
// Font Size Scale (in pixels)
// -----------------------------------------------------------------------------
export const fontSize = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   15,
  xl:   16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 24,
  '5xl': 28,
  '6xl': 32,
} as const;

export type FontSizeKey = keyof typeof fontSize;

// -----------------------------------------------------------------------------
// Font Weight Constants
// -----------------------------------------------------------------------------
export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold: '800',
} as const;

export type FontWeightKey = keyof typeof fontWeight;

// -----------------------------------------------------------------------------
// Line Height Constants
// -----------------------------------------------------------------------------
export const lineHeight = {
  tight:   1.2,
  snug:    1.375,
  normal:  1.5,
  relaxed: 1.625,
  loose:   2,
} as const;

// -----------------------------------------------------------------------------
// Letter Spacing
// -----------------------------------------------------------------------------
export const letterSpacing = {
  tighter: -0.8,
  tight:   -0.4,
  normal:   0,
  wide:     0.4,
  wider:    0.8,
} as const;

// -----------------------------------------------------------------------------
// Shadow Definitions for Cards / Elevated Surfaces
// -----------------------------------------------------------------------------
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1B2A4A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export type ShadowKey = keyof typeof shadows;

// -----------------------------------------------------------------------------
// Animation Presets
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Common Typography Presets
// -----------------------------------------------------------------------------
export const typography = {
  // Headings
  h1: {
    fontSize: fontSize['5xl'],   // 28
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSize['4xl'],   // 24
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSize['3xl'],   // 20
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontSize: fontSize['2xl'],   // 18
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },

  // Body
  body: {
    fontSize: fontSize.md,       // 14
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodyMedium: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySemibold: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Small
  sm: {
    fontSize: fontSize.sm,       // 12
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  smMedium: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Caption
  caption: {
    fontSize: fontSize.xs,       // 11
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.loose,
    letterSpacing: letterSpacing.wide,
  },

  // Labels
  label: {
    fontSize: fontSize.sm,       // 12
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase',
  },

  // Button
  button: {
    fontSize: fontSize.md,       // 14
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.normal,
  },
  buttonSm: {
    fontSize: fontSize.sm,       // 12
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.normal,
  },
} as const;

export type TypographyKey = keyof typeof typography;

// -----------------------------------------------------------------------------
// Z-Index Scale
// -----------------------------------------------------------------------------
export const zIndex = {
  base:     0,
  raised:   10,
  dropdown: 100,
  sticky:   200,
  overlay:  300,
  modal:    400,
  toast:    500,
  tooltip:  600,
} as const;

// -----------------------------------------------------------------------------
// Full Theme Object (convenience export)
// -----------------------------------------------------------------------------
export const Theme = {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  shadows,
  typography,
  zIndex,
  animations,
} as const;

export default Theme;
