import type { Settings } from '@/api/settings';

import { estimateItemMinutes } from './estimate';
import type { QuoteInput, QuoteItemInput, QuoteOptionsInput, QuoteBreakdown } from './types';

/** Minutes this item contributes to the visit: the manual override, else the estimate. */
function itemMinutes(item: QuoteItemInput, estimated: number): number {
  return item.estimatedMinutesOverride ?? estimated;
}

/**
 * Agorot the discount subtracts: `round(subtotal × value/100)` for percent, `min(subtotal, value)`
 * for amount — never more than the subtotal, so the computed price never goes below 0.
 */
export function applyDiscount(subtotal: number, options: QuoteOptionsInput): number {
  switch (options.discountType) {
    case 'percent':
      return Math.round((subtotal * options.discountValue) / 100);
    case 'amount':
      return Math.min(subtotal, options.discountValue);
    default:
      return 0;
  }
}

/**
 * Prices a visit from the seeded Settings. The minimum/needle-opening fee is charged once per visit
 * (`minimumPriceAgorot`); every money line is an integer number of agorot and every minute an integer.
 */
export function calcQuote(input: QuoteInput, settings: Settings): QuoteBreakdown {
  const { items, options } = input;

  const itemsEstimatedMinutes = items.map((item) =>
    estimateItemMinutes(item, settings.estimateTables),
  );
  const visitMinutes = items.reduce(
    (sum, item, i) => sum + itemMinutes(item, itemsEstimatedMinutes[i]),
    0,
  );

  const extraMinutes = Math.max(0, visitMinutes - settings.minimumMinutes);
  const base =
    settings.minimumPriceAgorot + Math.round((extraMinutes * settings.hourlyRateAgorot) / 60);

  const design = items.reduce(
    (sum, item) =>
      sum +
      (item.designSource === 'custom_design'
        ? Math.round((item.designHours ?? 0) * settings.designHourlyRateAgorot)
        : 0),
    0,
  );

  const extras = options.extraNeedles * settings.extraNeedleCostAgorot;
  const subtotal = base + design + extras;

  const discount = applyDiscount(subtotal, options);
  const computed = Math.max(0, subtotal - discount);
  const final = options.priceOverrideAgorot ?? computed;

  return {
    itemsEstimatedMinutes,
    visitMinutes,
    base,
    design,
    extras,
    discount,
    subtotal,
    computed,
    final,
  };
}
