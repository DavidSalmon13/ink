import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

export type BadgeProps = { label: string; style?: StyleProp<ViewStyle> };

/** design-system.html `.badge` — small primary-on-tint pill. Numbers inside are isolated LTR by the caller (`Num`). */
export function Badge({ label, style }: BadgeProps) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingVertical: t.spacing.xxs,
          paddingHorizontal: t.spacing.sm,
          borderRadius: t.radii.pill,
          backgroundColor: t.colors.primaryTint,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fontFace('600'), fontSize: m.badge.fontSize, color: t.colors.primary }}>{label}</Text>
    </View>
  );
}
