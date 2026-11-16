import type { ApiClient } from '@/api/client';

export type AuthErrorCode = 'invalid_credentials' | 'rate_limited' | 'network' | 'unknown';

/** A login failure the Login screen can show a message for. */
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

export interface DeviceInfo {
  name: string;
  platform: string;
}

export interface LoginResult {
  token: string;
  sessionId: string;
}

export interface AuthApi {
  login(email: string, password: string, device: DeviceInfo): Promise<LoginResult>;
  logout(): Promise<void>;
}

export function createAuthApi(client: ApiClient): AuthApi {
  void client;
  throw new Error('Not implemented (T12)');
}
