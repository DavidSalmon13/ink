import { Platform } from 'react-native';

/** Where the per-device session token lives: expo-secure-store on iOS, memory only on web. */
export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** Secure-store key for the session token. */
export const TOKEN_KEY = 'ink.sessionToken';

export function createTokenStore(platform: string = Platform.OS): TokenStore {
  void platform;
  throw new Error('Not implemented (T11)');
}
