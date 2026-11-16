import { useColorScheme } from 'react-native';

/**
 * The few design tokens the auth screens need, copied from design/design-system/tokens.json.
 * TEMPORARY: app-shell's theme module replaces this file (owner-auth-lock spec, Technical Approach).
 */
const palette = {
  light: {
    bg: '#F7F5F1',
    surface: '#FFFFFF',
    surfaceAlt: '#F1EDE2',
    text: '#1E1A18',
    textMuted: '#5F5550',
    border: '#E2DCD1',
    borderStrong: '#B9AEA0',
    primary: '#76544B',
    onPrimary: '#FFFFFF',
    danger: '#A9322A',
    shadow: '#1E1A18',
  },
  dark: {
    bg: '#131110',
    surface: '#1C1918',
    surfaceAlt: '#262220',
    text: '#F3EFE8',
    textMuted: '#A99F97',
    border: '#342F2C',
    borderStrong: '#5A514C',
    primary: '#C8A497',
    onPrimary: '#131110',
    danger: '#EE8C80',
    shadow: '#1E1A18',
  },
} as const;

export type AuthColors = { [K in keyof (typeof palette)['light']]: string };

export function useAuthColors(): AuthColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, screenPadding: 16 } as const;
export const radii = { md: 8, lg: 12, pill: 999 } as const;
export const borderWidth = { hairline: 1, strong: 1.5 } as const;
export const touch = { buttonHeight: 44, inputHeight: 44 } as const;
/** modalMaxWidth.tablet: keeps the form a readable width on iPad. */
export const formMaxWidth = 460;

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title1: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  callout: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  /** design-system.html `.field label` and `.helper` */
  label: { fontSize: 13, fontWeight: '600' },
  /** design-system.html `.input` / `.btn` (16px also stops iOS zooming into the field) */
  input: { fontSize: 16 },
  button: { fontSize: 16, fontWeight: '600' },
  /** ClientMode.html `.lock-pill` */
  pill: { fontSize: 14, fontWeight: '600' },
} as const;

/** design-system.html `.field` (label-to-input gap) and `.input` (inner padding). */
export const field = { gap: 6, inputPaddingHorizontal: 14 } as const;

/** tokens.json shadows.card */
export const cardShadow = {
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
} as const;
