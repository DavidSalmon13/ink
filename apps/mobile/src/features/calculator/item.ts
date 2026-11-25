import {
  placementTierOf,
  type Detail,
  type DesignSource,
  type QuoteItemInput,
  type Shading,
  type Size,
} from '@/pricing';

/**
 * One tattoo as the editor holds it. Numeric inputs stay as text while being typed; `placement` is a
 * body-placement chip id (mapped to a pricing tier by `placementTierOf`); `minutesOverride` is null
 * while the field shows the live estimate and becomes a string once Aya edits it.
 */
export interface ItemState {
  id: string;
  description: string;
  size: Size;
  detail: Detail;
  shading: Shading;
  placement: string;
  designSource: DesignSource;
  designHours: string;
  minutesOverride: string | null;
}

/** The Calculator's placement chips (Calculator.html) and the time tier each maps to via `placementTierOf`. */
export const PLACEMENTS: readonly { id: string; label: string }[] = [
  { id: 'forearm', label: 'אמה' },
  { id: 'arm', label: 'זרוע' },
  { id: 'thigh', label: 'ירך' },
  { id: 'calf', label: 'שוק' },
  { id: 'shoulder', label: 'כתף' },
  { id: 'back', label: 'גב' },
  { id: 'chest', label: 'חזה' },
  { id: 'wrist', label: 'שורש כף היד' },
  { id: 'ankle', label: 'קרסול' },
];

/** A fresh tattoo, defaulting to the mockup's first item (M · simple · none · forearm · existing sketch). */
export function newItem(id: string): ItemState {
  return {
    id,
    description: '',
    size: 'M',
    detail: 'simple',
    shading: 'none',
    placement: 'forearm',
    designSource: 'artist_sketch',
    designHours: '',
    minutesOverride: null,
  };
}

function toPositiveNumber(text: string): number {
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Converts the editor's item to the pricing module's input (tier resolved, text parsed to numbers). */
export function toQuoteItem(item: ItemState): QuoteItemInput {
  const override = item.minutesOverride?.trim();
  const overrideMinutes = override ? Number.parseInt(override, 10) : Number.NaN;
  return {
    description: item.description,
    size: item.size,
    detail: item.detail,
    shading: item.shading,
    placement: placementTierOf(item.placement),
    designSource: item.designSource,
    designHours: item.designSource === 'custom_design' ? toPositiveNumber(item.designHours) : 0,
    estimatedMinutesOverride: Number.isFinite(overrideMinutes) ? overrideMinutes : null,
  };
}
