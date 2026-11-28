import { useId } from 'react';
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

import { Icon } from './Icon';

export type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the input in the danger color with a warning glyph; also turns the border red. */
  error?: string | null;
  /** Error border without a message, for a form-level error shown once elsewhere (e.g. login). */
  invalid?: boolean;
  /** Muted hint under the input (hidden while an error shows). */
  helper?: string;
  /** Trailing unit inside the input, e.g. "ס״מ" (`.input .unit`). */
  unit?: string;
  /**
   * The value is a left-to-right run (phone, number, time), like design `.num`: digits separated by
   * spaces would otherwise display in reversed groups in the RTL app.
   */
  ltr?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.field` — label, 44px input, optional unit, helper or error. `ref` reaches the TextInput. */
export function Field({ label, error, invalid = false, helper, unit, ltr = false, style, ...input }: FieldProps) {
  const t = useTheme();
  const c = t.colors;
  const labelId = useId();
  const hasError = Boolean(error);
  const note = hasError ? error : helper;
  const redBorder = hasError || invalid;

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
          borderWidth: redBorder ? t.borderWidth.strong : t.borderWidth.hairline,
          borderColor: redBorder ? c.danger : c.borderStrong,
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
            // Without this the web <input>'s default intrinsic width (~174px) wins over flex shrink
            // (min-width defaults to `auto`, not 0, on the input element) and overflows a narrow field
            // like "זמן משוער" (width 132) leftward over its neighbour. See design `.num` width.
            minWidth: 0,
            minHeight: t.touch.inputHeight,
            fontFamily: fontFace('400'),
            fontSize: m.field.inputFontSize,
            color: c.text,
            ...(ltr ? { writingDirection: 'ltr' as const } : null),
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
