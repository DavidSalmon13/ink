// covers AC3, T4, T17 — numbers and ₪ amounts inside RTL text: LTR isolation and agorot formatting.
import { describe, expect, it } from '@jest/globals';

import { formatMoney, LRI, ltrIsolate, PDI } from '@/theme';

describe('ltrIsolate', () => {
  it('wraps a run in LRI … PDI', () => {
    expect(ltrIsolate('14:30')).toBe(`${LRI}14:30${PDI}`);
  });

  it('is idempotent', () => {
    expect(ltrIsolate(ltrIsolate('1,000 ₪'))).toBe(`${LRI}1,000 ₪${PDI}`);
  });
});

describe('formatMoney (integer agorot)', () => {
  it.each([
    [0, '0 ₪'],
    [100, '1 ₪'],
    [95_000, '950 ₪'],
    [100_000, '1,000 ₪'],
    [100_050, '1,000.50 ₪'],
    [5, '0.05 ₪'],
    [123_456_789, '1,234,567.89 ₪'],
    [-9_500, '−95 ₪'],
  ])('%i agorot → %s', (agorot, expected) => {
    expect(formatMoney(agorot)).toBe(expected);
  });

  it('rejects non-integer agorot', () => {
    expect(() => formatMoney(10.5)).toThrow(/integer/);
  });
});
