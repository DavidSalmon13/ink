import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Where the per-device session token lives: expo-secure-store on iOS, memory only on web. */
export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** Secure-store key for the session token. */
export const TOKEN_KEY = 'ink.sessionToken';

export function createTokenStore(platform: string = Platform.OS): TokenStore {
  if (platform === 'web') {
    // Web preview: memory only, so a reload signs out. Nothing is written to browser storage.
    let token: string | null = null;
    return {
      get: async () => token,
      set: async (value) => {
        token = value;
      },
      clear: async () => {
        token = null;
      },
    };
  }
  return {
    get: () => SecureStore.getItemAsync(TOKEN_KEY),
    set: (value) =>
      SecureStore.setItemAsync(TOKEN_KEY, value, {
        // Keychain item stays on this device (no iCloud/backup restore) and is readable only while unlocked.
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  };
}
