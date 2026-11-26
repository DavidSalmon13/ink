// covers client-quotes AC3, AC4, T6 — reopening a saved quote to edit it:
//   - `fromQuote` (T7) reverses the calculator → quote mapping, reconstructing the calculator state (items +
//     options + overrides) from a stored `Quote`, so the round-trip back through `buildQuoteInput` reproduces
//     the same inputs with the same item ids;
//   - edit-mode `buildQuoteInput` (T9) reuses the quote's item ids and sends its `version`, while the create
//     path (no version) is unchanged.
// `fromQuote` does not exist yet and `buildQuoteInput` has no edit context, so this suite is RED until T7/T9.
import { describe, expect, it } from '@jest/globals';

import type { Quote } from '@/api/quotes';

import { fromQuote } from '@/features/quotes/fromQuote';
import { type BuildQuoteArgs, buildQuoteInput } from '@/features/quotes/quoteInput';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';

/** A stored quote as the API returns it; prices/minutes are the server's authoritative recompute. */
function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: 'q-1',
    version: 4,
    createdAt: '2026-11-26T12:00:00Z',
    updatedAt: '2026-11-26T12:30:00Z',
    clientId: CLIENT_ID,
    title: 'שרוול',
    notes: 'ליד המרפק',
    discountType: 'amount',
    discountValue: 9500, // 95 ₪ in agorot
    extraNeedles: 2,
    priceOverrideAgorot: 60000, // 600 ₪
    computedPriceAgorot: 70000,
    finalPriceAgorot: 60000,
    estimatedMinutesTotal: 210,
    items: [
      {
        id: 'item-a',
        position: 0,
        description: 'דרקון',
        size: 'L',
        detailLevel: 'high',
        shading: 'full',
        bodyPlacement: 'arm', // the raw placement id — not the resolved tier
        designSource: 'custom_design',
        sketchId: null,
        designHours: 2.5,
        estimatedMinutes: 150,
        estimatedMinutesOverride: null,
      },
      {
        id: 'item-b',
        position: 1,
        description: 'ורד',
        size: 'M',
        detailLevel: 'simple',
        shading: 'none',
        bodyPlacement: 'forearm',
        designSource: 'artist_sketch',
        sketchId: null,
        designHours: null,
        estimatedMinutes: 60,
        estimatedMinutesOverride: 90, // Aya's manual minutes
      },
    ],
    ...over,
  };
}

describe('fromQuote — hydrate the calculator from a saved quote (client-quotes AC3)', () => {
  it('reconstructs each item (size/detail/shading/placement/source/hours/override), ids preserved', () => {
    const state = fromQuote(quote());

    expect(state.items).toHaveLength(2);
    expect(state.items[0]).toMatchObject({
      id: 'item-a',
      description: 'דרקון',
      size: 'L',
      detail: 'high',
      shading: 'full',
      placement: 'arm',
      designSource: 'custom_design',
      designHours: '2.5',
      minutesOverride: null,
    });
    expect(state.items[1]).toMatchObject({
      id: 'item-b',
      description: 'ורד',
      size: 'M',
      detail: 'simple',
      shading: 'none',
      placement: 'forearm',
      designSource: 'artist_sketch',
      designHours: '',
      minutesOverride: '90',
    });
  });

  it('reconstructs the options: an amount discount → ₪ shekels text, extra needles, manual price', () => {
    const { options } = fromQuote(quote());
    expect(options).toEqual({
      extraNeedles: 2,
      discountKind: 'amount',
      discountValue: '95',
      priceOverride: '600',
    });
  });

  it('reconstructs a percent discount back to its percent value', () => {
    const { options } = fromQuote(quote({ discountType: 'percent', discountValue: 15 }));
    expect(options).toMatchObject({ discountKind: 'percent', discountValue: '15' });
  });

  it('leaves no discount and no manual price empty', () => {
    const { options } = fromQuote(
      quote({ discountType: 'none', discountValue: 0, priceOverrideAgorot: null }),
    );
    expect(options).toMatchObject({ discountValue: '', priceOverride: '' });
  });

  it('round-trips through buildQuoteInput: the same inputs and the same item ids come back out', () => {
    const q = quote();
    const itemIds = q.items.map((item) => item.id);
    const input = buildQuoteInput(fromQuote(q), {
      clientId: q.clientId,
      title: q.title,
      notes: q.notes ?? '',
      itemIds,
    });

    expect(input).toMatchObject({
      clientId: CLIENT_ID,
      discountType: 'amount',
      discountValue: 9500,
      extraNeedles: 2,
      priceOverrideAgorot: 60000,
    });
    expect(input.items[0]).toMatchObject({
      id: 'item-a',
      position: 0,
      size: 'L',
      detailLevel: 'high',
      shading: 'full',
      bodyPlacement: 'arm',
      designSource: 'custom_design',
      designHours: 2.5,
      estimatedMinutesOverride: null,
    });
    expect(input.items[1]).toMatchObject({
      id: 'item-b',
      position: 1,
      designSource: 'artist_sketch',
      designHours: null,
      estimatedMinutesOverride: 90,
    });
  });
});

describe('buildQuoteInput — edit mode reuses ids + sends version (client-quotes AC4)', () => {
  const state = fromQuote(quote());
  const base = { clientId: CLIENT_ID, title: 'שרוול', notes: '' };

  it('sends the quote version and reuses the existing item ids when editing', () => {
    const itemIds = ['item-a', 'item-b'];
    // The edit context carries the last-seen version; the create path never sets it.
    const args = { ...base, itemIds, version: 4 } as BuildQuoteArgs & { version: number };
    const input = buildQuoteInput(state, args);

    expect(input.version).toBe(4);
    expect(input.items.map((item) => item.id)).toEqual(itemIds);
  });

  it('omits version on the create path (no edit context)', () => {
    const input = buildQuoteInput(state, { ...base, itemIds: ['new-a', 'new-b'] });
    expect(input.version).toBeUndefined();
  });
});
