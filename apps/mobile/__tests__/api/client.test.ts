// covers AC15, T2, T11 — apiFetch adds the Bearer token and ends the session on a 401.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, createApiClient, NetworkError } from '@/api/client';

const BASE = 'http://api.test';
const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
const onUnauthorized = jest.fn<() => void>();
let token: string | null;

beforeEach(() => {
  mockFetch.mockReset();
  onUnauthorized.mockReset();
  token = 'tok-123';
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

function client(timeoutMs?: number) {
  return createApiClient({ baseUrl: BASE, timeoutMs, getToken: async () => token, onUnauthorized });
}

function response(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  });
}

function sentHeaders(): Record<string, string> {
  const init = mockFetch.mock.calls[0][1];
  return Object.fromEntries(new Headers(init?.headers).entries());
}

describe('apiFetch', () => {
  it('sends Authorization: Bearer <token> to <baseUrl><path> and returns the JSON body', async () => {
    mockFetch.mockResolvedValue(response(200, [{ id: 's1' }]));
    await expect(client().apiFetch('/auth/sessions')).resolves.toEqual([{ id: 's1' }]);
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/auth/sessions`);
    expect(sentHeaders().authorization).toBe('Bearer tok-123');
  });

  it('sends no Authorization header when there is no token', async () => {
    token = null;
    mockFetch.mockResolvedValue(response(200, {}));
    await client().apiFetch('/anything');
    expect(sentHeaders().authorization).toBeUndefined();
  });

  it('sends JSON bodies with the method and content type', async () => {
    mockFetch.mockResolvedValue(response(200, { ok: true }));
    await client().apiFetch('/things', { method: 'POST', body: { a: 1 } });
    const init = mockFetch.mock.calls[0][1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
    expect(sentHeaders()['content-type']).toBe('application/json');
  });

  it('returns undefined for 204 No Content', async () => {
    mockFetch.mockResolvedValue(response(204));
    await expect(client().apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('on 401 calls onUnauthorized and throws ApiError(401)', async () => {
    mockFetch.mockResolvedValue(response(401, { error: { code: 'unauthorized', message: 'x' } }));
    const err = await client().apiFetch('/auth/sessions').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).code).toBe('unauthorized');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('a public request (auth: false) sends no token and a 401 does not end the session', async () => {
    mockFetch.mockResolvedValue(response(401, { error: { code: 'invalid_credentials', message: 'x' } }));
    const err = await client()
      .apiFetch('/auth/login', { method: 'POST', body: {}, auth: false })
      .catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(401);
    expect(sentHeaders().authorization).toBeUndefined();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('throws ApiError with the status on other errors, without ending the session', async () => {
    mockFetch.mockResolvedValue(response(500, { error: { code: 'internal', message: 'x' } }));
    const err = await client().apiFetch('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('throws NetworkError when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(client().apiFetch('/x')).rejects.toBeInstanceOf(NetworkError);
  });

  it('throws NetworkError on timeout', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const result = client(100).apiFetch('/x');
    const settled = result.catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(100);
    expect(await settled).toBeInstanceOf(NetworkError);
  });
});
