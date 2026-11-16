import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { createApiClient, type ApiClient } from '@/api/client';
import { createAuthApi, type AuthApi, type DeviceInfo } from '@/auth/authApi';
import { createTokenStore, type TokenStore } from '@/auth/tokenStore';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  /** Throws AuthError on failure; stores the token and becomes signedIn on success. */
  signIn(email: string, password: string): Promise<void>;
  /** Revokes this device's session on the API (best effort), clears the token, becomes signedOut. */
  signOut(): Promise<void>;
  /** The API answered 401: the session is gone. Clears the token without calling the API. */
  sessionExpired(): Promise<void>;
}

export interface AuthDeps {
  tokenStore: TokenStore;
  authApi: AuthApi;
  device: DeviceInfo;
  /** The authenticated API client for the rest of the app (useApiClient). */
  apiClient?: ApiClient;
}

/** Set by the mounted AuthProvider: what an API 401 does (clear the token, back to Login). */
let onSessionExpired: ((rejectedToken: string | null) => void) | null = null;

/** Real wiring: secure-store token, API client whose 401s end the session, this device's name. */
function createDefaultDeps(): AuthDeps {
  const tokenStore = createTokenStore();
  const client = createApiClient({
    getToken: () => tokenStore.get(),
    onUnauthorized: (rejectedToken) => onSessionExpired?.(rejectedToken),
  });
  return {
    tokenStore,
    apiClient: client,
    authApi: createAuthApi(client),
    device: { name: Device.deviceName ?? Device.modelName ?? Platform.OS, platform: Platform.OS },
  };
}

const AuthContext = createContext<AuthState | null>(null);
const ApiClientContext = createContext<ApiClient | null>(null);

export function AuthProvider({ children, deps }: { children: ReactNode; deps?: AuthDeps }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  const [{ tokenStore, authApi, device, apiClient }] = useState<AuthDeps>(() => deps ?? createDefaultDeps());

  // Signed in once per device: a stored token means signedIn without a login call.
  useEffect(() => {
    let active = true;
    tokenStore
      .get()
      .catch(() => null)
      .then((token) => {
        if (!active) return;
        setStatus((current) => (current === 'loading' ? (token ? 'signedIn' : 'signedOut') : current));
      });
    return () => {
      active = false;
    };
  }, [tokenStore]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token } = await authApi.login(email.trim(), password, device);
      await tokenStore.set(token);
      setStatus('signedIn');
    },
    [authApi, device, tokenStore],
  );

  const sessionExpired = useCallback(async () => {
    await tokenStore.clear();
    setStatus('signedOut');
  }, [tokenStore]);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Offline or already revoked: still sign out locally. The session can be revoked from another device.
    }
    await sessionExpired();
  }, [authApi, sessionExpired]);

  useEffect(() => {
    onSessionExpired = (rejectedToken) => {
      void (async () => {
        // A 401 for a token that's no longer stored (she signed in again meanwhile) is stale: ignore it.
        if (rejectedToken !== null && (await tokenStore.get().catch(() => null)) !== rejectedToken) return;
        await sessionExpired();
      })();
    };
    return () => {
      onSessionExpired = null;
    };
  }, [sessionExpired, tokenStore]);

  const value = useMemo<AuthState>(
    () => ({ status, signIn, signOut, sessionExpired }),
    [status, signIn, signOut, sessionExpired],
  );
  return (
    <AuthContext.Provider value={value}>
      <ApiClientContext.Provider value={apiClient ?? null}>{children}</ApiClientContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}

/** The API client whose requests carry this device's session token; a 401 signs out. */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error('useApiClient must be used inside <AuthProvider> with an API client');
  return client;
}
