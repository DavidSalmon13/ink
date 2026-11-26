import { Pressable, View } from 'react-native';

import type { Quote } from '@/api/quotes';
import { Num, Text, useTheme } from '@/theme';
import { Card, formatDayDate, IconButton } from '@/ui';

export interface QuoteRowProps {
  quote: Quote;
  /** Reopen the quote in the Calculator to edit it (the list navigates on row press). */
  onReopen?: (quote: Quote) => void;
  /** Request deletion of this quote (the list owns the confirm + mutation). */
  onDelete?: (quote: Quote) => void;
}

/**
 * One saved quote on the client card's Quotes tab (client-quotes AC1): the title and its final price in ₪
 * (an isolated LTR run), with a muted meta line (saved date · estimated minutes). The whole row reopens the
 * quote; the trailing trash button asks the list to delete it (AC2). No mockup — built from `Card` + tokens.
 */
export function QuoteRow({ quote, onReopen, onDelete }: QuoteRowProps) {
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
        <IconButton
          icon="trash"
          accessibilityLabel={`מחיקת הצעה: ${quote.title}`}
          onPress={() => onDelete?.(quote)}
        />
      </Card>
    </Pressable>
  );
}
