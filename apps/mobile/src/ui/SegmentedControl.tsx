import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

export type Segment<T extends string> = {
  value: T;
  label: string;
  /** Second line, e.g. "7–12" under a size (`.seg button small`). */
  sublabel?: string;
};

export type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for VoiceOver (e.g. "תצוגה"). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.seg` — one choice from a few; the selected segment is raised. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const t = useTheme();
  const c = t.colors;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          padding: m.segmented.padding,
          gap: m.segmented.gap,
          backgroundColor: c.surfaceAlt,
          borderRadius: t.radii.md,
        },
        style,
      ]}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={segment.sublabel ? `${segment.label} ${segment.sublabel}` : segment.label}
            onPress={() => onChange(segment.value)}
            style={[
              {
                flex: 1,
                minHeight: m.segmented.minHeight,
                paddingHorizontal: m.segmented.paddingHorizontal,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: t.radii.sm,
              },
              selected && { backgroundColor: c.surface, ...t.shadows.card },
            ]}
          >
            <Text
              style={{
                fontFamily: fontFace(selected ? '700' : '500'),
                fontSize: m.segmented.fontSize,
                color: selected ? c.primary : c.text,
              }}
            >
              {segment.label}
            </Text>
            {segment.sublabel ? (
              <Text style={{ fontFamily: fontFace('400'), fontSize: m.segmented.subFontSize, color: c.textMuted }}>
                {segment.sublabel}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
