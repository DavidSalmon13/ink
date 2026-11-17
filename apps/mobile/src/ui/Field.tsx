import { useId } from 'react';
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

import { Icon } from './Icon';

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the input in the danger color with a warning glyph; also turns the border red. */
  error?: string | null;
  /** Muted hint under the input (hidden while an error shows). */
  helper?: string;
  /** Trailing unit inside the input, e.g. "ס״מ" (`.input .unit`). */
  unit?: string;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.field` — label, 44px input, optional unit, helper or error. `ref` reaches the TextInput. */
export function Field({ label, error, helper, unit, style, ...input }: FieldProps) {
  const t = useTheme();
  const c = t.colors;
  const labelId = useId();
  const hasError = Boolean(error);
  const note = hasError ? error : helper;

  return (
    <View style={[{ gap: m.field.gap }, style]}>
      <Text
        nativeID={labelId}
        style={{ fontFamily: fontFace('600'), fontSize: m.field.labelFontSize, color: c.textMuted }}
      >
        {label}
      </Text>
      <View
        style={{
          minHeight: t.touch.inputHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: m.field.inputGap,
          paddingHorizontal: m.field.inputPaddingHorizontal,
          backgroundColor: c.surface,
          borderRadius: t.radii.md,
          borderWidth: hasError ? t.borderWidth.strong : t.borderWidth.hairline,
          borderColor: hasError ? c.danger : c.borderStrong,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityLabelledBy={labelId}
          accessibilityHint={hasError ? (error ?? undefined) : helper}
          placeholderTextColor={c.textMuted}
          {...input}
          style={{
            flex: 1,
            minHeight: t.touch.inputHeight,
            fontFamily: fontFace('400'),
            fontSize: m.field.inputFontSize,
            color: c.text,
          }}
        />
        {unit ? (
          <Text style={{ fontFamily: fontFace('400'), fontSize: m.field.unitFontSize, color: c.textMuted }}>{unit}</Text>
        ) : null}
      </View>
      {note ? (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: m.field.helperGap }}
          accessibilityLiveRegion={hasError ? 'polite' : 'none'}
        >
          {hasError ? <Icon name="warning" size={m.field.helperIconSize} color="danger" /> : null}
          <Text
            style={{
              fontFamily: fontFace(hasError ? '600' : '400'),
              fontSize: m.field.helperFontSize,
              color: hasError ? c.danger : c.textMuted,
            }}
          >
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
