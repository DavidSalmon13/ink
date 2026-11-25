import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { Settings } from '@/api/settings';
import type { QuoteBreakdown } from '@/pricing';
import { ltrIsolate, Num, Text, useTheme } from '@/theme';
import { Card } from '@/ui';

/** One `.sum-row`: a muted label at the start, an isolated LTR number at the end. */
function SumRow({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: t.spacing.xs + 1,
      }}
    >
      <Text variant="body" color="textMuted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** The seeded rates as the mockup's helper sentence (shekels, with the per-minute rate trimmed). */
function minimumHelper(settings: Settings): string {
  const minimum = ltrIsolate(`${Math.round(settings.minimumPriceAgorot / 100)} ₪`);
  const minutes = ltrIsolate(String(settings.minimumMinutes));
  const perMinute = ltrIsolate(`${settings.hourlyRateAgorot / 100} ₪`);
  return `מינימום ${minimum} כולל ${minutes} דקות ראשונות, ואחר כך ${perMinute} לדקה. דמי פתיחת מחט פעם אחת לביקור.`;
}

export interface SummaryProps {
  breakdown: QuoteBreakdown;
  settings: Settings;
}

/**
 * The summary card (Calculator.html `.summary`): משך ביקור / מחיר בסיס / דמי עיצוב / תוספת מחטים / הנחה /
 * סה״כ. The design, needles and discount rows are hidden when zero. The total is the final price (the
 * manual override when set, else the computed total). Every number / ₪ / דק׳ is an isolated LTR run.
 */
export function Summary({ breakdown, settings }: SummaryProps) {
  const t = useTheme();
  const c = t.colors;

  return (
    <Card style={{ padding: 14 }}>
      <SumRow label="משך ביקור">
        <Num variant="body" color="text">{`${breakdown.visitMinutes} דק׳`}</Num>
      </SumRow>
      <SumRow label="מחיר בסיס">
        <Num variant="body" color="text" agorot={breakdown.base} />
      </SumRow>
      {breakdown.design > 0 ? (
        <SumRow label="דמי עיצוב">
          <Num variant="body" color="text" agorot={breakdown.design} />
        </SumRow>
      ) : null}
      {breakdown.extras > 0 ? (
        <SumRow label="תוספת מחטים">
          <Num variant="body" color="text" agorot={breakdown.extras} />
        </SumRow>
      ) : null}
      {breakdown.discount > 0 ? (
        <SumRow label="הנחה">
          <Num variant="body" color="text" agorot={-breakdown.discount} />
        </SumRow>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: t.spacing.xs + 2,
          paddingTop: t.spacing.md,
          borderTopWidth: t.borderWidth.hairline,
          borderTopColor: c.border,
        }}
      >
        <Text variant="title2">סה״כ</Text>
        <Num variant="price" color="text" agorot={breakdown.final} />
      </View>

      <Text variant="callout" color="textMuted" style={{ marginTop: t.spacing.xs + 2 }}>
        {minimumHelper(settings)}
      </Text>
    </Card>
  );
}
