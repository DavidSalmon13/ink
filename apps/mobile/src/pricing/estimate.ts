import type { EstimateTables } from '@/api/settings';

import { roundUpTo5 } from './roundUpTo5';
import type { PlacementTier, QuoteItemInput } from './types';

/** Visit time never drops below this many minutes per item. */
const MIN_ITEM_MINUTES = 15;

/** estimatedMinutes = roundUpTo5( max(15, product) ) from the raw size×detail×shading×placement product. */
export function estimateMinutesFromProduct(product: number): number {
  return roundUpTo5(Math.max(MIN_ITEM_MINUTES, product));
}

/** estimatedMinutes = roundUpTo5( max(15, sizeBase × detail × shading × placement) ), reading the tables. */
export function estimateItemMinutes(item: QuoteItemInput, tables: EstimateTables): number {
  const product =
    tables.sizeBaseMinutes[item.size] *
    tables.detail[item.detail] *
    tables.shading[item.shading] *
    tables.placement[item.placement];
  return estimateMinutesFromProduct(product);
}

/**
 * Maps a body-placement id (the Calculator's placement chips) to its time-estimate tier.
 * The MVP exposes the easy and medium placements as chips; the hard tier exists in the tables
 * but has no chips yet (spec Out of Scope). Unknown ids fall back to the fastest tier.
 */
const PLACEMENT_TIER: Record<string, PlacementTier> = {
  forearm: 'easy',
  arm: 'easy',
  thigh: 'easy',
  calf: 'easy',
  back: 'medium',
  shoulder: 'medium',
  chest: 'medium',
  wrist: 'medium',
  ankle: 'medium',
  ribs: 'hard',
  neck: 'hard',
  hands: 'hard',
  feet: 'hard',
  spine: 'hard',
  sternum: 'hard',
};

export function placementTierOf(placementId: string): PlacementTier {
  return PLACEMENT_TIER[placementId] ?? 'easy';
}
