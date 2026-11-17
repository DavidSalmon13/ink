import type { TextStyle } from 'react-native';

import { typeScale, type TypeScaleName } from './tokens.generated';

/**
 * Heebo weights loaded by app/_layout.tsx (@expo-google-fonts/heebo). Each weight is its own face,
 * so a style names the face instead of combining a family with `fontWeight` (tokens.json → fonts.expo).
 */
export const fontFaces = {
  '400': 'Heebo_400Regular',
  '500': 'Heebo_500Medium',
  '600': 'Heebo_600SemiBold',
  '700': 'Heebo_700Bold',
} as const;

export type FontWeight = keyof typeof fontFaces;

/** The loaded face for a scale weight. */
export function fontFace(weight: FontWeight): string {
  return fontFaces[weight];
}

type ScaleEntry = (typeof typeScale)[TypeScaleName];

function toTextStyle(entry: ScaleEntry): TextStyle {
  return {
    fontFamily: fontFace(entry.fontWeight),
    fontSize: entry.fontSize,
    lineHeight: entry.lineHeight,
    ...('letterSpacing' in entry ? { letterSpacing: entry.letterSpacing } : null),
  };
}

/** RN text styles for every step of the tokens.json type scale. */
export const textStyles = Object.fromEntries(
  (Object.keys(typeScale) as TypeScaleName[]).map((name) => [name, toTextStyle(typeScale[name])]),
) as Record<TypeScaleName, TextStyle>;
