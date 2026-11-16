import { ApiError, NetworkError, type ApiClient } from '@/api/client';

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

/** Maps an apiFetch failure to the few cases the Login screen distinguishes. */
function toAuthError(error: unknown): AuthError {
  if (error instanceof NetworkError) return new AuthError('network');
  if (error instanceof ApiError && error.status === 401) return new AuthError('invalid_credentials');
  if (error instanceof ApiError && error.status === 429) return new AuthError('rate_limited');
  return new AuthError('unknown');
}

export function createAuthApi(client: ApiClient): AuthApi {
  return {
    async login(email, password, device) {
      try {
        return await client.apiFetch<LoginResult>('/auth/login', {
          method: 'POST',
          auth: false,
          body: { email, password, deviceName: device.name, platform: device.platform },
        });
      } catch (error) {
        throw toAuthError(error);
      }
    },
    async logout() {
      await client.apiFetch('/auth/logout', { method: 'POST' });
    },
  };
}
