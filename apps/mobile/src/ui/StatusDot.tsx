import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { componentMetrics as m, fontFace, useTheme, type ColorName } from '@/theme';

export type SketchStatus = 'available' | 'reserved' | 'done';

const dotColor: Record<SketchStatus, ColorName> = {
  available: 'statusAvailable',
  reserved: 'statusReserved',
  done: 'statusDone',
};

/** The mockups' wording (SketchLibrary.html / design-system.html). */
export const statusLabels: Record<SketchStatus, string> = {
  available: 'פנויה',
  reserved: 'שמורה',
  done: 'בוצעה',
};

export type StatusDotProps = {
  status: SketchStatus;
  /** Overrides the default Hebrew label. A label is always shown — color is never the only signal. */
  label?: string;
  /** Muted trailing detail, e.g. "· נועה ב." */
  detail?: string;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.status` — colored dot plus its text label. */
export function StatusDot({ status, label = statusLabels[status], detail, style }: StatusDotProps) {
  const t = useTheme();
  const c = t.colors;
  const text = { fontFamily: fontFace('500'), fontSize: m.status.fontSize } as const;
  return (
    <View
      accessible
      accessibilityLabel={detail ? `${label} ${detail}` : label}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: m.status.gap }, style]}
    >
      <View
        testID={`status-dot-${status}`}
        style={{
          width: m.status.dotSize,
          height: m.status.dotSize,
          borderRadius: t.radii.pill,
          backgroundColor: c[dotColor[status]],
        }}
      />
      <Text style={[text, { color: c.text }]}>{label}</Text>
      {detail ? <Text style={[text, { color: c.textMuted }]}>{detail}</Text> : null}
    </View>
  );
}
