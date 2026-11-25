/**
 * Inputs and output of the pure pricing module. Mirrors the shape the authoritative Java
 * `app.ink.api.pricing` package will use in the save-quote spec, so the two copies agree on the
 * shared vectors in `fixtures/pricing-vectors.json`. No React, no network: it takes a Settings value.
 */
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type Detail = 'simple' | 'medium' | 'high';
export type Shading = 'none' | 'light' | 'full';
export type PlacementTier = 'easy' | 'medium' | 'hard';
export type DesignSource = 'artist_sketch' | 'client_reference' | 'custom_design';
export type DiscountType = 'none' | 'percent' | 'amount';

export interface QuoteItemInput {
  description?: string;
  size: Size;
  detail: Detail;
  shading: Shading;
  /** The resolved time-estimate tier (see `placementTierOf` for the body-placement → tier map). */
  placement: PlacementTier;
  designSource: DesignSource;
  /** Hours of custom-design work; billed only when designSource === 'custom_design'. */
  designHours?: number;
  /** Aya's manual minutes; replaces the estimate for this item when set. */
  estimatedMinutesOverride?: number | null;
}

export interface QuoteOptionsInput {
  extraNeedles: number;
  discountType: DiscountType;
  /** Percent (0–100) when discountType === 'percent'; integer agorot when 'amount'. */
  discountValue: number;
  /** Manual final price in agorot; overrides the computed total when set. */
  priceOverrideAgorot?: number | null;
}

export interface QuoteInput {
  items: QuoteItemInput[];
  options: QuoteOptionsInput;
}

/** Every money line is an integer number of agorot; every minute value is an integer. */
export interface QuoteBreakdown {
  /** Per-item estimated minutes from the formula, before any override. */
  itemsEstimatedMinutes: number[];
  visitMinutes: number;
  base: number;
  design: number;
  extras: number;
  /** Agorot subtracted by the discount (0 when none). */
  discount: number;
  subtotal: number;
  computed: number;
  final: number;
}
