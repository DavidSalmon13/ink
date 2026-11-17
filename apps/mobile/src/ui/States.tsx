import type { ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { componentMetrics as m, fontFace, Text, useTheme } from '@/theme';

import { Button } from './Button';
import { Card } from './Card';
import { decorativeProps, Icon } from './Icon';

type Framed = {
  /** Wrap in a Card, as on design-system.html (default). Pass false when already inside one. */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** design-system.html `.st` — centered column, 200px tall, inside a card by default. */
type StateFrameProps = Framed & {
  children: ReactNode;
  /** When set, the frame is one accessible element with this label (used by the loading state). */
  accessibilityLabel?: string;
  accessibilityState?: { busy?: boolean };
};

function StateFrame({ card = true, style, children, ...labelled }: StateFrameProps) {
  const a11y = labelled.accessibilityLabel ? { accessible: true, ...labelled } : {};
  const t = useTheme();
  const frame: ViewStyle = {
    minHeight: m.state.minHeight,
    padding: t.spacing.lg,
    gap: m.state.gap,
    alignItems: 'center',
    justifyContent: 'center',
  };
  return card ? (
    <Card {...a11y} style={[frame, style]}>
      {children}
    </Card>
  ) : (
    <View {...a11y} style={[frame, style]}>
      {children}
    </View>
  );
}

function Helper({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: fontFace('400'),
        fontSize: m.field.helperFontSize,
        color: t.colors.textMuted,
        textAlign: 'center',
      }}
    >
      {children}
    </Text>
  );
}

/** The empty-state illustration from design-system.html (moon + star, accent line color). Decorative. */
export function EmptyArt({ size = m.state.artSize }: { size?: number }) {
  const t = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={t.colors.accentLine}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...decorativeProps}
      testID="empty-art"
    >
      <Path d="M58 20a31 31 0 1 0 0 60 25 25 0 1 1 0-60z" />
      <Path d="M72 30l1.8 5h5.2l-4.2 3 1.6 5-4.4-3-4.4 3 1.6-5-4.2-3h5.2z" />
      <Circle cx={66} cy={58} r={1} />
      <Circle cx={76} cy={50} r={0.8} />
    </Svg>
  );
}

export type EmptyStateProps = Framed & {
  /** e.g. "אין תורים היום" */
  title: string;
  /** Muted line under the title. */
  message?: string;
  /** Typically `<Button small label="תור חדש" icon="plus" />`. */
  action?: ReactNode;
  /** Show the illustration (default true). */
  art?: boolean;
};

/** design-system.html empty state — illustration, headline, optional primary action. */
export function EmptyState({ title, message, action, art = true, ...frame }: EmptyStateProps) {
  return (
    <StateFrame {...frame}>
      {art ? <EmptyArt /> : null}
      <Text variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? <Helper>{message}</Helper> : null}
      {action}
    </StateFrame>
  );
}

export type SkeletonProps = { width?: DimensionValue; height?: number; style?: StyleProp<ViewStyle> };

/** design-system.html `.skel` — a placeholder bar. */
export function Skeleton({ width = '100%', height = m.state.skeletonHeight, style }: SkeletonProps) {
  const t = useTheme();
  return (
    <View
      style={[
        { width, height, borderRadius: m.state.skeletonRadius, backgroundColor: t.colors.surfaceAlt },
        style,
      ]}
    />
  );
}

export type LoadingStateProps = Framed & { label?: string };

/** design-system.html loading state — three skeleton bars and "טוען…", announced as busy. */
export function LoadingState({ label = 'טוען…', ...frame }: LoadingStateProps) {
  return (
    <StateFrame {...frame} accessibilityLabel={label} accessibilityState={{ busy: true }}>
      {m.state.skeletonWidths.map((width) => (
        <Skeleton key={width} width={width} style={{ alignSelf: 'stretch' }} />
      ))}
      <Helper>{label}</Helper>
    </StateFrame>
  );
}

export type ErrorStateProps = Framed & {
  /** e.g. "אין חיבור" */
  title: string;
  /** e.g. "השינויים יישמרו כשהחיבור יחזור." */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** design-system.html error state — warning glyph, headline, helper, secondary "נסו שוב". */
export function ErrorState({ title, message, onRetry, retryLabel = 'נסו שוב', ...frame }: ErrorStateProps) {
  return (
    <StateFrame {...frame}>
      <Icon name="warning" size={m.state.errorIconSize} color="danger" />
      <Text variant="headline" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message ? <Helper>{message}</Helper> : null}
      {onRetry ? <Button variant="secondary" small label={retryLabel} onPress={onRetry} /> : null}
    </StateFrame>
  );
}
