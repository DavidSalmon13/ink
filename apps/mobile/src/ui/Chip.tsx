import type { ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.chip` — a toggle; selected fills with the primary color. */
export function Chip({ label, selected = false, style, ...rest }: ChipProps) {
  const t = useTheme();
  const c = t.colors;
  return (
    <Pressable
      accessibilityRole="togglebutton"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: m.chip.minHeight,
          paddingHorizontal: m.chip.paddingHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          gap: m.chip.gap,
          borderRadius: t.radii.sm,
          borderWidth: t.borderWidth.hairline,
          borderColor: selected ? c.primary : c.borderStrong,
          backgroundColor: selected ? c.primary : 'transparent',
          opacity: pressed ? m.pressedOpacity : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: fontFace(selected ? '600' : '400'),
          fontSize: m.chip.fontSize,
          color: selected ? c.onPrimary : c.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** `.chips` — wrapping row of chips. */
export function Chips({
  accessibilityLabel,
  children,
  style,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: m.chip.groupGap }, style]}
    >
      {children}
    </View>
  );
}
