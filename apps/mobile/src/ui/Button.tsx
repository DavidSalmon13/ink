import { ActivityIndicator, Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme, type Palette } from '@/theme';

import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  /** `.btn-sm`: 15px label, tighter padding (same 44px height). */
  small?: boolean;
  /** `.btn-block`: full width. */
  block?: boolean;
  /** Leading glyph (sits at the start, i.e. right of the label in RTL). */
  icon?: IconName;
  /** Shows a spinner, announces busy, and blocks presses. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

function variantColors(c: Palette, variant: ButtonVariant, disabled: boolean) {
  if (disabled) return { bg: c.surfaceAlt, fg: c.textMuted, border: 'transparent' };
  switch (variant) {
    case 'primary':
      return { bg: c.primary, fg: c.onPrimary, border: 'transparent' };
    case 'secondary':
      return { bg: 'transparent', fg: c.primary, border: c.primary };
    case 'destructive':
      return { bg: c.danger, fg: c.onDanger, border: 'transparent' };
    case 'ghost':
      return { bg: 'transparent', fg: c.primary, border: 'transparent' };
  }
}

/** design-system.html `.btn` — primary / secondary / destructive / ghost, plus disabled. */
export function Button({
  label,
  variant = 'primary',
  small = false,
  block = false,
  icon,
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const inactive = Boolean(disabled) || loading;
  const v = variantColors(t.colors, variant, inactive);
  const paddingHorizontal =
    variant === 'ghost' ? m.button.paddingHorizontalGhost : small ? m.button.paddingHorizontalSmall : m.button.paddingHorizontal;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      {...rest}
      style={({ pressed }) => [
        {
          minHeight: t.touch.buttonHeight,
          paddingHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          // Inline like the design's `.btn`: follows the parent's alignment unless `block`.
          alignSelf: block ? 'stretch' : undefined,
          gap: m.button.gap,
          borderRadius: t.radii.md,
          borderWidth: t.borderWidth.strong,
          borderColor: v.border,
          backgroundColor: v.bg,
          opacity: pressed ? m.pressedOpacity : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <Icon name={icon} tint={v.fg} size={variant === 'ghost' || small ? m.button.iconSizeSmall : m.button.iconSize} />
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fontFace('600'),
          fontSize: small ? m.button.fontSizeSmall : m.button.fontSize,
          color: v.fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  icon: IconName;
  /** Required: the glyph is decorative, so this is what VoiceOver reads (e.g. "סגירה"). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.iconbtn` — 44×44 round, transparent, glyph in the text color. */
export function IconButton({ icon, accessibilityLabel, disabled, style, ...rest }: IconButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        {
          width: t.touch.minTarget,
          height: t.touch.minTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: t.radii.pill,
          opacity: pressed ? m.pressedOpacity : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={m.iconButton.iconSize} color={disabled ? 'textMuted' : 'text'} />
    </Pressable>
  );
}
