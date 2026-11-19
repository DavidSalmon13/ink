import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

export type Tab<T extends string> = {
  value: T;
  label: string;
};

export type TabsProps<T extends string> = {
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the strip for VoiceOver (e.g. "לשוניות כרטיס לקוח"). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * design-system.html `.tabs` — an underlined strip of sections (e.g. the client card's
 * קעקועים / הצעות מחיר / הערות). Pass the screen padding through `style`.
 */
export function Tabs<T extends string>({ tabs, value, onChange, accessibilityLabel, style }: TabsProps<T>) {
  const t = useTheme();
  const c = t.colors;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row', borderBottomWidth: t.borderWidth.hairline, borderBottomColor: c.border }, style]}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.value)}
            style={{
              minHeight: m.tabs.minHeight,
              paddingHorizontal: m.tabs.paddingHorizontal,
              justifyContent: 'center',
              borderBottomWidth: m.tabs.indicatorWidth,
              borderBottomColor: selected ? c.primary : 'transparent',
              marginBottom: -t.borderWidth.hairline,
            }}
          >
            <Text
              style={{
                fontFamily: fontFace(selected ? '700' : '500'),
                fontSize: m.tabs.fontSize,
                color: selected ? c.primary : c.textMuted,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
