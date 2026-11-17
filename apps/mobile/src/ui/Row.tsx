import { Children, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, useTheme } from '@/theme';

import { Card } from './Card';
import { Icon } from './Icon';

export type RowProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  /** Trailing muted chevron (navigates somewhere). */
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * design-system.html `.row` — 52px min height, 8px × screen-padding inset, 12px gap.
 * Pressable only when `onPress` is given; put a `flex: 1` View around the main text (`.grow`).
 */
export function Row({ children, chevron = false, onPress, style, ...rest }: RowProps) {
  const t = useTheme();
  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.spacing.rowHeight,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.screenPadding,
  };
  const content = (
    <>
      {children}
      {chevron ? <Icon name="chevron" size={m.row.chevronSize} color="textMuted" /> : null}
    </>
  );

  if (!onPress) return <View style={[base, style]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      {...rest}
      style={({ pressed }) => [base, { opacity: pressed ? m.pressedOpacity : 1 }, style]}
    >
      {content}
    </Pressable>
  );
}

/** design-system.html `.card.rows` — rows in a card, hairline dividers between them. */
export function Rows({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const rows = Children.toArray(children);
  return (
    <Card style={style}>
      {rows.map((row, i) => (
        <View
          key={i}
          style={i > 0 ? { borderTopWidth: t.borderWidth.hairline, borderTopColor: t.colors.border } : undefined}
        >
          {row}
        </View>
      ))}
    </Card>
  );
}
