import { Platform } from 'react-native';

import type { LocalAuthResult } from '@/auth/localAuth';

/** Fresh local authentication before a sensitive screen (My Data). Web preview: always allowed. */
export async function requireReauth(
  authenticate: () => Promise<LocalAuthResult>,
  platform: string = Platform.OS,
): Promise<boolean> {
  if (platform === 'web') return true;
  // No remembered approval: every call prompts.
  return (await authenticate()) === 'success';
}
