// covers AC11, T2, T11 — the session token lives in secure-store on iOS and only in memory on web.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSecureStore = {
  getItemAsync: jest.fn<(key: string) => Promise<string | null>>(),
  setItemAsync: jest.fn<(key: string, value: string, options?: object) => Promise<void>>(),
  deleteItemAsync: jest.fn<(key: string) => Promise<void>>(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
};
// The factory runs when tokenStore.ts is imported (hoisted above this file's consts),
// so it forwards each call to mockSecureStore at call time instead of capturing it.
jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => mockSecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string, options?: object) =>
    mockSecureStore.setItemAsync(key, value, options),
  deleteItemAsync: (key: string) => mockSecureStore.deleteItemAsync(key),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

import { createTokenStore, TOKEN_KEY } from '@/auth/tokenStore';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('tokenStore on iOS', () => {
  it('saves the token in secure-store, readable only on this device while unlocked', async () => {
    const store = createTokenStore('ios');
    await store.set('tok-123');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      TOKEN_KEY,
      'tok-123',
      expect.objectContaining({ keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' }),
    );
  });

  it('reads the token back from secure-store (survives an app restart)', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('tok-123');
    await expect(createTokenStore('ios').get()).resolves.toBe('tok-123');
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('returns null when nothing is stored', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    await expect(createTokenStore('ios').get()).resolves.toBeNull();
  });

  it('clear() deletes the secure-store entry', async () => {
    await createTokenStore('ios').clear();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
  });
});

describe('tokenStore on web (preview)', () => {
  it('keeps the token in memory only and never touches secure-store', async () => {
    const store = createTokenStore('web');
    await expect(store.get()).resolves.toBeNull();
    await store.set('tok-web');
    await expect(store.get()).resolves.toBe('tok-web');
    await store.clear();
    await expect(store.get()).resolves.toBeNull();
    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockSecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('a new store (page reload) starts empty', async () => {
    await createTokenStore('web').set('tok-web');
    await expect(createTokenStore('web').get()).resolves.toBeNull();
  });
});
