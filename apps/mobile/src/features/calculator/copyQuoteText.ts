import type { QuoteBreakdown, QuoteItemInput, Shading } from '@/pricing';
import { formatMoney } from '@/theme';

/** Shading as it reads in the copied quote; "none" adds nothing to the line. */
const SHADING_LABEL: Record<Shading, string> = {
  none: '',
  light: 'עדינות',
  full: 'מלאות',
};

/** The effective minutes for an item: the manual override, else the estimate from the breakdown. */
function itemMinutes(item: QuoteItemInput, index: number, breakdown: QuoteBreakdown): number {
  return item.estimatedMinutesOverride ?? breakdown.itemsEstimatedMinutes[index];
}

/**
 * The itemized Hebrew quote text for the clipboard (AC6): a `הצעת מחיר` heading, one line per tattoo
 * (`<description> · <size> · <shading?> · <minutes> דק׳`, the shading omitted when "ללא"), then the
 * visit length and total. Plain text for WhatsApp/Instagram — no client, nothing saved.
 */
export function copyQuoteText(items: QuoteItemInput[], breakdown: QuoteBreakdown): string {
  const lines = items.map((item, index) => {
    const minutes = itemMinutes(item, index, breakdown);
    const description = item.description?.trim() || `קעקוע ${index + 1}`;
    const parts = [description, item.size, SHADING_LABEL[item.shading], `${minutes} דק׳`].filter(Boolean);
    return parts.join(' · ');
  });

  return [
    'הצעת מחיר',
    '',
    ...lines,
    '',
    `משך ביקור: ${breakdown.visitMinutes} דק׳`,
    `סה״כ: ${formatMoney(breakdown.final)}`,
  ].join('\n');
}
