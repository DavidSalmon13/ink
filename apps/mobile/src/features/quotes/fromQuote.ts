import type { Quote, QuoteItem } from '@/api/quotes';
// Import from the leaf calculator modules, not the barrel: the barrel pulls in CalculatorScreen, which imports
// this feature, so going through it would form a runtime cycle (same reason as quoteInput.ts).
import {
  type CalculatorState,
  type DiscountKind,
  type OptionsState,
} from '@/features/calculator/calculatorState';
import { newItem, type ItemState } from '@/features/calculator/item';

/**
 * Integer agorot back to the shekels text the options fields hold: an integer amount loses its decimals
 * ("600"), a fractional one keeps two ("95.50"); null (no manual price) becomes the empty string. The inverse
 * of `shekelsToAgorot` — `shekelsToAgorot` re-parses either form to the same agorot, so the round-trip is
 * value-stable.
 */
function agorotToShekels(agorot: number | null): string {
  if (agorot === null) return '';
  const whole = Math.trunc(agorot / 100);
  const cents = Math.abs(agorot % 100);
  return cents === 0 ? String(whole) : `${whole}.${String(cents).padStart(2, '0')}`;
}

/** Reverses {@link toQuoteOptions}: the stored discount/needles/manual-price back to the options the UI holds. */
function optionsFromQuote(quote: Quote): OptionsState {
  let discountKind: DiscountKind = 'percent';
  let discountValue = '';
  if (quote.discountType === 'percent') {
    // Stored as the percent number itself (0–100).
    discountValue = String(quote.discountValue);
  } else if (quote.discountType === 'amount') {
    // Stored as integer agorot → the ₪ shekels text.
    discountKind = 'amount';
    discountValue = agorotToShekels(quote.discountValue);
  }
  // 'none' keeps the defaults (percent selector, empty value).
  return {
    extraNeedles: quote.extraNeedles,
    discountKind,
    discountValue,
    priceOverride: agorotToShekels(quote.priceOverrideAgorot),
  };
}

/**
 * Reverses {@link toQuoteItem}/`buildQuoteInput`'s item mapping: a stored {@link QuoteItem} back to the editor
 * item. The raw `bodyPlacement` id is carried straight across (the forward tier resolution is one-way, so the
 * saved id is what the chip needs); numeric fields become their text form, and the server minutes estimate is
 * dropped — only Aya's manual override survives as the field's value. Starts from {@link newItem} so any field
 * the quote doesn't carry keeps its editor default.
 */
function itemFromQuote(item: QuoteItem): ItemState {
  return {
    ...newItem(item.id),
    description: item.description,
    size: item.size,
    detail: item.detailLevel,
    shading: item.shading,
    placement: item.bodyPlacement,
    designSource: item.designSource,
    designHours: item.designHours !== null ? String(item.designHours) : '',
    minutesOverride:
      item.estimatedMinutesOverride !== null ? String(item.estimatedMinutesOverride) : null,
  };
}

/**
 * Hydrates the Calculator from a saved quote (client-quotes AC3) — the inverse of the forward mapping
 * (`toQuoteInput` → `toQuoteItem`/`toQuoteOptions`). Items are taken in `position` order and keep their stored
 * ids so an edit-mode save reuses them (AC4). Prices and minute estimates are not reconstructed: the server
 * recomputes them, so feeding the result back through `buildQuoteInput` reproduces the same inputs and totals.
 */
export function fromQuote(quote: Quote): CalculatorState {
  const items = [...quote.items].sort((a, b) => a.position - b.position).map(itemFromQuote);
  return {
    items,
    options: optionsFromQuote(quote),
    nextId: items.length,
  };
}
