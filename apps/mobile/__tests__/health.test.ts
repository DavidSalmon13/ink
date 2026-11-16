// covers AC5, T9, T15 — GET /health: only a 200 with status UP counts as connected.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { checkApiHealth } from '@/api/health';

const BASE = 'http://api.test';
const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe('checkApiHealth', () => {
  it('calls <baseUrl>/health and returns connected on {status: UP}', async () => {
    mockFetch.mockResolvedValue(response({ status: 'UP' }));
    await expect(checkApiHealth(BASE)).resolves.toBe('connected');
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/health`, expect.anything());
  });

  it('returns unreachable when the status is not UP', async () => {
    mockFetch.mockResolvedValue(response({ status: 'DOWN' }));
    await expect(checkApiHealth(BASE)).resolves.toBe('unreachable');
  });

  it('returns unreachable on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(response({ status: 'UP' }, false));
    await expect(checkApiHealth(BASE)).resolves.toBe('unreachable');
  });

  it('returns unreachable on a network error', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(checkApiHealth(BASE)).resolves.toBe('unreachable');
  });

  it('returns unreachable when the request times out', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const result = checkApiHealth(BASE, 100);
    jest.advanceTimersByTime(100);
    await expect(result).resolves.toBe('unreachable');
    jest.useRealTimers();
  });
});
