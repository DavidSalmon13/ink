import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

export type AvatarProps = {
  /** The person's name; the avatar shows its first letter. */
  name: string;
  /** Circle diameter; defaults to the design-system 44px (e.g. 40 in ClientCard.ipad.html's list pane). */
  size?: number;
  /** Initial font size; defaults to the design-system 16px. */
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** First visible letter of a name ("תמר אדלר" → "ת"). */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0] ?? '';
}

/**
 * design-system.html `.avatar` — 44px circle with the initial in primary on primaryTint.
 * Decorative: the row next to it already says the name.
 */
export function Avatar({ name, size = m.avatar.size, fontSize = m.avatar.fontSize, style }: AvatarProps) {
  const t = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: t.radii.pill,
          backgroundColor: t.colors.primaryTint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fontFace('700'), fontSize, color: t.colors.primary }}>
        {initialOf(name)}
      </Text>
    </View>
  );
}
