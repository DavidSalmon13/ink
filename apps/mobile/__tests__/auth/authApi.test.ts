// covers AC4, AC5, AC8, AC10, T2, T12 — login/logout calls and the errors the Login screen shows.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, NetworkError, type ApiClient, type ApiRequest } from '@/api/client';
import { AuthError, createAuthApi } from '@/auth/authApi';

const apiFetch = jest.fn<(path: string, request?: ApiRequest) => Promise<unknown>>();
const client = { apiFetch } as unknown as ApiClient;
const device = { name: 'iPhone 16', platform: 'ios' };

beforeEach(() => {
  apiFetch.mockReset();
});

describe('authApi.login', () => {
  it('POSTs credentials and device info to /auth/login as a public request', async () => {
    apiFetch.mockResolvedValue({ token: 'tok', sessionId: 'sid' });
    await expect(createAuthApi(client).login('aya@example.com', 'pw', device)).resolves.toEqual({
      token: 'tok',
      sessionId: 'sid',
    });
    expect(apiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: 'aya@example.com', password: 'pw', deviceName: 'iPhone 16', platform: 'ios' },
    });
  });

  it.each([
    [new ApiError(401, 'invalid_credentials'), 'invalid_credentials'],
    [new ApiError(429, 'rate_limited'), 'rate_limited'],
    [new NetworkError(), 'network'],
    [new ApiError(500), 'unknown'],
  ] as const)('maps %p to AuthError(%s)', async (thrown, code) => {
    apiFetch.mockRejectedValue(thrown);
    const err = await createAuthApi(client).login('a', 'b', device).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect((err as AuthError).code).toBe(code);
  });
});

describe('authApi.logout', () => {
  it('POSTs /auth/logout with the session token', async () => {
    apiFetch.mockResolvedValue(undefined);
    await createAuthApi(client).logout();
    expect(apiFetch).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
  });
});
