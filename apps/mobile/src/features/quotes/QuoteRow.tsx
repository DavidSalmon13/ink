import { Pressable, View } from 'react-native';

import type { Quote } from '@/api/quotes';
import { Num, Text, useTheme } from '@/theme';
import { Card, formatDayDate } from '@/ui';

export interface QuoteRowProps {
  quote: Quote;
  /** Reopen the quote in the Calculator (wired to navigation in T10). */
  onReopen?: (quote: Quote) => void;
}

/**
 * One saved quote on the client card's Quotes tab (client-quotes AC1): the title and its final price in ₪
 * (an isolated LTR run), with a muted meta line (saved date · estimated minutes). The whole row reopens the
 * quote; the delete affordance is added in T5. No mockup — built from `Card` + theme tokens.
 */
export function QuoteRow({ quote, onReopen }: QuoteRowProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`הצעה: ${quote.title}`}
      onPress={() => onReopen?.(quote)}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <View style={{ flex: 1, gap: t.spacing.xxs }}>
          <Text variant="headline" numberOfLines={1}>
            {quote.title}
          </Text>
          <Text variant="callout" color="textMuted">
            {formatDayDate(quote.createdAt)} ·{' '}
            <Num variant="callout" color="textMuted">
              {quote.estimatedMinutesTotal}
            </Num>{' '}
            דק׳
          </Text>
        </View>
        <Num variant="price" color="text" agorot={quote.finalPriceAgorot} />
      </Card>
    </Pressable>
  );
}
