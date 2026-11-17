import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

export type SectionHeaderProps = {
  title: string;
  /** Trailing control at the end, e.g. `<Button variant="ghost" small label="הכול" />`. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Home.html `.section-h` — muted small heading with an optional action, 20/8 margins, screen-padding inset. */
export function SectionHeader({ title, action, style }: SectionHeaderProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: t.spacing.screenPadding,
          marginTop: t.spacing.xl,
          marginBottom: t.spacing.sm,
        },
        style,
      ]}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fontFace('700'),
          fontSize: m.sectionHeader.fontSize,
          letterSpacing: m.sectionHeader.letterSpacing,
          color: t.colors.textMuted,
        }}
      >
        {title}
      </Text>
      {action}
    </View>
  );
}
