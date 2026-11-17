import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { TypeScaleName } from './tokens.generated';
import { useTheme, type ColorName } from './useTheme';

export type TextProps = RNTextProps & {
  /** Step of the tokens.json type scale. Defaults to `body`. */
  variant?: TypeScaleName;
  /** Palette color. Defaults to `text`. */
  color?: ColorName;
};

/** Themed text: applies a type-scale step and a palette color; `style` overrides last. */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText {...rest} style={[theme.text[variant], { color: theme.colors[color] }, style]} />;
}
