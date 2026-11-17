import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

import { Icon } from './Icon';

export type SearchProps = Omit<TextInputProps, 'style'> & {
  /** Spoken label (the mockup's visually hidden "חיפוש"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.search` — filled 44px field with a leading search glyph. */
export function Search({ accessibilityLabel = 'חיפוש', style, ...input }: SearchProps) {
  const t = useTheme();
  const c = t.colors;
  return (
    <View
      style={[
        {
          minHeight: t.touch.inputHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: m.search.gap,
          paddingHorizontal: m.search.paddingHorizontal,
          backgroundColor: c.surfaceAlt,
          borderRadius: t.radii.md,
        },
        style,
      ]}
    >
      <Icon name="search" size={m.search.iconSize} color="textMuted" />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        placeholderTextColor={c.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        {...input}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: t.touch.inputHeight,
          fontFamily: fontFace('400'),
          fontSize: m.search.fontSize,
          color: c.text,
        }}
      />
    </View>
  );
}
