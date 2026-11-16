// covers AC10, AC11, AC15, T2, T12 — auth state: stored token → signed in, sign in/out, expired session.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AuthError, type AuthApi } from '@/auth/authApi';
import { AuthProvider, useAuth, type AuthDeps } from '@/auth/AuthProvider';
import type { TokenStore } from '@/auth/tokenStore';

let stored: string | null;
const tokenStore: TokenStore = {
  get: jest.fn(async () => stored),
  set: jest.fn(async (t: string) => {
    stored = t;
  }),
  clear: jest.fn(async () => {
    stored = null;
  }),
};
const login = jest.fn<AuthApi['login']>();
const logout = jest.fn<AuthApi['logout']>();
const deps: AuthDeps = { tokenStore, authApi: { login, logout }, device: { name: 'iPhone 16', platform: 'ios' } };

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider deps={deps}>{children}</AuthProvider>;
}

async function renderAuth() {
  return renderHook(() => useAuth(), { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  stored = null;
});

describe('AuthProvider', () => {
  it('starts loading, then signedOut when no token is stored', async () => {
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
  });

  it('is signedIn when a token is already stored (sign in once per device)', async () => {
    stored = 'tok-existing';
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));
    expect(login).not.toHaveBeenCalled();
  });

  it('signIn trims the email, sends the device info, stores the token and becomes signedIn', async () => {
    login.mockResolvedValue({ token: 'tok-new', sessionId: 'sid' });
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));

    await act(() => result.current.signIn('  aya@example.com ', 'pw'));

    expect(login).toHaveBeenCalledWith('aya@example.com', 'pw', deps.device);
    expect(tokenStore.set).toHaveBeenCalledWith('tok-new');
    expect(result.current.status).toBe('signedIn');
  });

  it('signIn rethrows AuthError and stays signedOut on wrong credentials', async () => {
    login.mockRejectedValue(new AuthError('invalid_credentials'));
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedOut'));

    let err: unknown;
    await act(async () => {
      err = await result.current.signIn('aya@example.com', 'bad').catch((e: unknown) => e);
    });

    expect((err as AuthError).code).toBe('invalid_credentials');
    expect(tokenStore.set).not.toHaveBeenCalled();
    expect(result.current.status).toBe('signedOut');
  });

  it('signOut revokes the session on the API, clears the token and becomes signedOut', async () => {
    stored = 'tok-existing';
    logout.mockResolvedValue(undefined);
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    await act(() => result.current.signOut());

    expect(logout).toHaveBeenCalledTimes(1);
    expect(tokenStore.clear).toHaveBeenCalled();
    expect(result.current.status).toBe('signedOut');
  });

  it('signOut still clears the token when the API call fails (offline)', async () => {
    stored = 'tok-existing';
    logout.mockRejectedValue(new Error('offline'));
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    await act(() => result.current.signOut());

    expect(tokenStore.clear).toHaveBeenCalled();
    expect(result.current.status).toBe('signedOut');
  });

  it('sessionExpired clears the token without calling the API and becomes signedOut', async () => {
    stored = 'tok-existing';
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe('signedIn'));

    await act(() => result.current.sessionExpired());

    expect(logout).not.toHaveBeenCalled();
    expect(tokenStore.clear).toHaveBeenCalled();
    expect(result.current.status).toBe('signedOut');
  });
});
