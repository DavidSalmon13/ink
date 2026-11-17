import { Text, type TextProps } from './Text';
import { formatMoney, ltrIsolate } from './numeric';

export type NumProps = Omit<TextProps, 'children'> & {
  /** Plain value (a number, time like "11:00", count…). Ignored when `agorot` is given. */
  children?: string | number;
  /** Money in integer agorot, rendered as "1,000 ₪". */
  agorot?: number;
};

/**
 * A number, time or ₪ amount as its own isolated LTR run with tabular figures (design `.num`).
 * Nest it inside Hebrew `Text` or use it on its own; when nested, pass the surrounding `variant`/`color`
 * (Text applies its own defaults rather than inheriting).
 */
export function Num({ children, agorot, style, ...rest }: NumProps) {
  const value = agorot != null ? formatMoney(agorot) : String(children ?? '');
  return (
    <Text {...rest} style={[{ fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, style]}>
      {ltrIsolate(value)}
    </Text>
  );
}
