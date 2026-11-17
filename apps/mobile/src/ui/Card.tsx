import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type CardProps = ViewProps & { children?: ReactNode; style?: StyleProp<ViewStyle> };

/** design-system.html `.card` — surface, hairline border, large radius, card shadow. Padding is the caller's. */
export function Card({ style, children, ...rest }: CardProps) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.colors.surface,
          borderWidth: t.borderWidth.hairline,
          borderColor: t.colors.border,
          borderRadius: t.radii.lg,
          ...t.shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
