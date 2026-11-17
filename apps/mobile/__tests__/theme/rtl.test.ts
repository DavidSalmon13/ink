// covers AC3, AC13, T4, T16, T17 — RTL bootstrap: native forces once, web uses <html dir> and never forces.
import { describe, expect, it, jest } from '@jest/globals';

import { applyRTL } from '@/theme';

function fakeI18n(isRTL: boolean) {
  return { isRTL, allowRTL: jest.fn(), forceRTL: jest.fn() };
}

describe('applyRTL', () => {
  it('forces RTL on a device that is not RTL yet', () => {
    const i18n = fakeI18n(false);
    expect(applyRTL('ios', i18n)).toBe('forced');
    expect(i18n.allowRTL).toHaveBeenCalledWith(true);
    expect(i18n.forceRTL).toHaveBeenCalledWith(true);
  });

  it('does nothing more once the device is already RTL', () => {
    const i18n = fakeI18n(true);
    expect(applyRTL('ios', i18n)).toBe('already-rtl');
    expect(i18n.forceRTL).not.toHaveBeenCalled();
  });

  it('on web sets <html dir="rtl" lang="he"> and never calls forceRTL (no reload loop)', () => {
    // react-native-web's I18nManager never reports RTL, however many times the page loads.
    const i18n = fakeI18n(false);
    const doc = { documentElement: { dir: '', lang: 'en' } };
    for (let load = 0; load < 3; load++) {
      expect(applyRTL('web', i18n, doc)).toBe('web');
    }
    expect(doc.documentElement).toEqual({ dir: 'rtl', lang: 'he' });
    expect(i18n.forceRTL).not.toHaveBeenCalled();
    expect(i18n.allowRTL).not.toHaveBeenCalled();
  });

  it('on web without a document (static rendering) does not throw', () => {
    expect(applyRTL('web', fakeI18n(false), undefined)).toBe('web');
  });
});
