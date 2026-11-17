import { useColorScheme } from 'react-native';

import {
  borderWidth,
  colors,
  layout,
  radii,
  shadows,
  spacing,
  touch,
  zIndex,
  type ColorScheme,
} from './tokens.generated';
import { textStyles } from './typography';

export type Palette = (typeof colors)[ColorScheme];

/** Palette keys that hold a color (excludes numeric entries such as `scrimOpacity`). */
export type ColorName = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  text: typeof textStyles;
  spacing: typeof spacing;
  radii: typeof radii;
  borderWidth: typeof borderWidth;
  shadows: typeof shadows;
  zIndex: typeof zIndex;
  touch: typeof touch;
  layout: typeof layout;
};

const statics = { text: textStyles, spacing, radii, borderWidth, shadows, zIndex, touch, layout };

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: colors.light, ...statics },
  dark: { scheme: 'dark', colors: colors.dark, ...statics },
};

/** The theme for the device's color scheme (light unless the system reports dark). */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Shorthand for the active palette. */
export function useColors(): Palette {
  return useTheme().colors;
}
