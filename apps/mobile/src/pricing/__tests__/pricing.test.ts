// covers AC1 (pure pricing module), AC2 (shared vectors), AC3 (nearest-calibration hint);
// tasks T2 (these failing tests) + T3 (the implementation that makes them pass).
//
// Every expected number lives in the shared fixture — the same file the save-quote Java suite
// will reuse — so this suite only *reads* it and asserts the module agrees. No arithmetic here.
import { describe, expect, it } from '@jest/globals';

import type { Settings } from '@/api/settings';
import {
  calcQuote,
  calibrationHint,
  estimateItemMinutes,
  estimateMinutesFromProduct,
  nearestCalibration,
  roundUpTo5,
  type QuoteItemInput,
  type QuoteOptionsInput,
} from '@/pricing';

import vectors from '../../../../../fixtures/pricing-vectors.json';

const settings = vectors.settings as unknown as Settings;

describe('roundUpTo5 (AC1)', () => {
  it.each(vectors.roundUpTo5)('$input → $expected ($note)', ({ input, expected }) => {
    expect(roundUpTo5(input)).toBe(expected);
  });
});

describe('estimateMinutesFromProduct — floor + round-up (AC1)', () => {
  it.each(vectors.estimateFromProduct)('product $product → $expected ($note)', ({ product, expected }) => {
    expect(estimateMinutesFromProduct(product)).toBe(expected);
  });
});

describe('estimateItemMinutes — per item from the seed tables (AC1, AC2)', () => {
  for (const c of vectors.cases) {
    it(`${c.name}: per-item estimated minutes`, () => {
      const got = c.items.map((i) =>
        estimateItemMinutes(i as unknown as QuoteItemInput, settings.estimateTables),
      );
      expect(got).toEqual(c.expected.itemsEstimatedMinutes);
    });
  }
});

describe('nearestCalibration — closest point, ties → fewer minutes (AC3)', () => {
  it.each(vectors.calibration)(
    'estimated $estimated → $label ≈ $minutes ($note)',
    ({ estimated, label, minutes }) => {
      const p = nearestCalibration(estimated, settings.calibrationPoints);
      expect(p.label).toBe(label);
      expect(p.minutes).toBe(minutes);
    },
  );
});

describe('calibrationHint — Hebrew label map render (AC3)', () => {
  it.each(vectors.hints)('estimated $estimated → "$text"', ({ estimated, text }) => {
    expect(calibrationHint(estimated, settings.calibrationPoints)).toBe(text);
  });
});

describe('calcQuote — full breakdown, all integer agorot (AC1, AC2)', () => {
  for (const c of vectors.cases) {
    it(`${c.name}`, () => {
      const b = calcQuote(
        {
          items: c.items as unknown as QuoteItemInput[],
          options: c.options as unknown as QuoteOptionsInput,
        },
        settings,
      );
      expect(b.itemsEstimatedMinutes).toEqual(c.expected.itemsEstimatedMinutes);
      expect(b.visitMinutes).toBe(c.expected.visitMinutes);
      expect(b.base).toBe(c.expected.base);
      expect(b.design).toBe(c.expected.design);
      expect(b.extras).toBe(c.expected.extras);
      expect(b.discount).toBe(c.expected.discount);
      expect(b.subtotal).toBe(c.expected.subtotal);
      expect(b.computed).toBe(c.expected.computed);
      expect(b.final).toBe(c.expected.final);
      // every money line is an integer number of agorot
      for (const v of [b.base, b.design, b.extras, b.discount, b.subtotal, b.computed, b.final]) {
        expect(Number.isInteger(v)).toBe(true);
      }
    });
  }
});
