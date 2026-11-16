// covers AC15, T12 — the real wiring: an authenticated 401 clears the token and signs out,
// but a late 401 for an old token doesn't end a newer session.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

let stored: string | null;
const mockSecureStore = {
  getItemAsync: jest.fn(async () => stored),
  setItemAsync: jest.fn(async (_key: string, value: string) => {
    stored = value;
  }),
  deleteItemAsync: jest.fn(async () => {
    stored = null;
  }),
};
// Forward at call time: the factory runs before this file's consts are initialised.
jest.mock('expo-secure-store', () => ({
  getItemAsync: () => mockSecureStore.getItemAsync(),
  setItemAsync: (key: string, value: string) => mockSecureStore.setItemAsync(key, value),
  deleteItemAsync: () => mockSecureStore.deleteItemAsync(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

import { AuthProvider, useApiClient, useAuth } from '@/auth/AuthProvider';

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

function unauthorized() {
  return new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'x' } }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  // No deps: the real tokenStore + apiClient + 401 handler, as the app uses them.
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderSignedIn() {
  const hook = await renderHook(() => ({ auth: useAuth(), api: useApiClient() }), { wrapper });
  await waitFor(() => expect(hook.result.current.auth.status).toBe('signedIn'));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  stored = 'tok-A';
});

describe('session expiry through the real API client', () => {
  it('a 401 on an authenticated request clears the stored token and signs out', async () => {
    mockFetch.mockResolvedValue(unauthorized());
    const { result } = await renderSignedIn();

    await act(async () => {
      await result.current.api.apiFetch('/auth/sessions').catch(() => undefined);
    });

    await waitFor(() => expect(result.current.auth.status).toBe('signedOut'));
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(new Headers(mockFetch.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer tok-A');
  });

  it('a late 401 for an old token does not end the newer session', async () => {
    // She signs in again (new token stored) while a request with the old token is in flight.
    mockFetch.mockImplementation(async () => {
      stored = 'tok-B';
      return unauthorized();
    });
    const { result } = await renderSignedIn();

    await act(async () => {
      await result.current.api.apiFetch('/auth/sessions').catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.auth.status).toBe('signedIn');
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(stored).toBe('tok-B');
  });
});
