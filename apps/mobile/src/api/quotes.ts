import type { ApiClient } from '@/api/client';
import type { DesignSource, Detail, DiscountType, Shading, Size } from '@/pricing/types';

/**
 * A quote as the API returns it (save-quote AC4). Every money field is integer agorot and every minute an
 * integer; the prices and `estimatedMinutesTotal` are the server's authoritative recompute from the Settings
 * row — the client never sets them (AC3). `items` are the tattoos of the visit, ordered by `position`.
 */
export interface Quote {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  title: string;
  notes: string | null;
  discountType: DiscountType;
  /** Percent (0–100) when `discountType === 'percent'`; integer agorot when `'amount'`; 0 when `'none'`. */
  discountValue: number;
  extraNeedles: number;
  /** Manual final price in agorot; null when not set. */
  priceOverrideAgorot: number | null;
  computedPriceAgorot: number;
  finalPriceAgorot: number;
  estimatedMinutesTotal: number;
  items: QuoteItem[];
}

/** One tattoo within a quote (save-quote AC4). `estimatedMinutes` is server-recomputed; carries no price. */
export interface QuoteItem {
  id: string;
  position: number;
  description: string;
  size: Size;
  detailLevel: Detail;
  shading: Shading;
  /** The raw body-placement id (the time tier is derived from it server-side). */
  bodyPlacement: string;
  designSource: DesignSource;
  /** Nullable with no backing table until the Sketch epic. */
  sketchId: string | null;
  /** Hours of custom-design work; null unless `designSource === 'custom_design'`. */
  designHours: number | null;
  estimatedMinutes: number;
  /** Aya's manual minutes; null when the estimate is used. */
  estimatedMinutesOverride: number | null;
}

/**
 * The quote to save (save-quote AC5). `version` is absent when creating and the last-seen version when
 * editing. Client-sent prices are not part of the input — the server recomputes them — so only the item and
 * option inputs are sent.
 */
export interface QuoteInput {
  version?: number;
  clientId: string;
  title: string;
  notes?: string | null;
  discountType: DiscountType;
  discountValue: number;
  extraNeedles: number;
  priceOverrideAgorot?: number | null;
  items: QuoteItemInput[];
}

/** One item of a {@link QuoteInput}; `id` is device-generated. The server recomputes `estimatedMinutes`. */
export interface QuoteItemInput {
  id: string;
  position: number;
  description: string;
  size: Size;
  detailLevel: Detail;
  shading: Shading;
  bodyPlacement: string;
  designSource: DesignSource;
  sketchId?: string | null;
  designHours?: number | null;
  estimatedMinutesOverride?: number | null;
}

/**
 * Creates (no `version`, device-generated `id`) or updates (the last-seen `version`) a quote. Retrying the
 * same call is safe. Throws ApiError `version_conflict` with `details.current` when another device saved
 * first, `validation_failed` with `details.fields` for invalid input, and `not_found` when the client is
 * unknown or deleted.
 */
export function putQuote(api: ApiClient, id: string, input: QuoteInput): Promise<Quote> {
  return api.apiFetch<Quote>(`/quotes/${id}`, { method: 'PUT', body: input });
}

/** One live quote; ApiError `not_found` when it's unknown or deleted. */
export function getQuote(api: ApiClient, id: string): Promise<Quote> {
  return api.apiFetch<Quote>(`/quotes/${id}`, { method: 'GET' });
}

/** A client's live quotes, newest first (save-quote AC4). */
export function listQuotes(api: ApiClient, clientId: string): Promise<Quote[]> {
  return api.apiFetch<Quote[]>(`/quotes?clientId=${encodeURIComponent(clientId)}`, { method: 'GET' });
}

/** Soft-deletes a quote (save-quote AC4). Idempotent: deleting twice, or an unknown id, also succeeds. */
export function deleteQuote(api: ApiClient, id: string): Promise<void> {
  return api.apiFetch<void>(`/quotes/${id}`, { method: 'DELETE' });
}
