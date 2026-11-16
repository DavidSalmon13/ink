import type { ReactNode } from 'react';

import type { AuthApi, DeviceInfo } from '@/auth/authApi';
import type { TokenStore } from '@/auth/tokenStore';

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
}

export function AuthProvider({ children, deps }: { children: ReactNode; deps?: AuthDeps }) {
  void deps;
  return <>{children}</>;
}

export function useAuth(): AuthState {
  throw new Error('Not implemented (T12)');
}
