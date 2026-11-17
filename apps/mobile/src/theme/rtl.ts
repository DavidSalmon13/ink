import { I18nManager, Platform } from 'react-native';

type RTLManager = Pick<typeof I18nManager, 'isRTL' | 'allowRTL' | 'forceRTL'>;
type DocumentLike = { documentElement: { dir: string; lang: string } };

export type RTLResult = 'web' | 'already-rtl' | 'forced';

/**
 * Lays the app out right-to-left (AC3), safely on every platform (AC13).
 *
 * - Web: react-native-web's I18nManager is a stub (`isRTL` stays false, `forceRTL` does nothing), so
 *   anything that waits for it to flip would reload forever. Direction comes from the document instead:
 *   `<html dir="rtl" lang="he">`. Never calls forceRTL and never asks for a reload. During static
 *   rendering there is no document; the client applies it on hydration.
 * - Native: forces RTL only when it isn't on yet. The first launch after forcing needs one restart
 *   to take effect (RN applies it at startup); later launches return `already-rtl`. Nothing here
 *   reloads the app, so there's no loop.
 */
export function applyRTL(
  platform: string = Platform.OS,
  i18n: RTLManager = I18nManager,
  doc: DocumentLike | undefined = typeof document === 'undefined' ? undefined : document,
): RTLResult {
  if (platform === 'web') {
    if (doc) {
      doc.documentElement.dir = 'rtl';
      doc.documentElement.lang = 'he';
    }
    return 'web';
  }
  i18n.allowRTL(true);
  if (i18n.isRTL) return 'already-rtl';
  i18n.forceRTL(true);
  return 'forced';
}
