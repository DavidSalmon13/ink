// covers api-conventions AC10, T11 — typed GET/PUT /settings helpers.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, createApiClient } from '@/api/client';
import { getSettings, saveSettings, type Settings, type SettingsInput } from '@/api/settings';

const BASE = 'http://api.test';
const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const api = () => createApiClient({ baseUrl: BASE, getToken: async () => 'tok', onUnauthorized: () => {} });

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const settings: Settings = {
  id: '6f1c2c1e-0000-4000-8000-000000000001',
  version: 2,
  createdAt: '2026-11-17T10:00:00Z',
  updatedAt: '2026-11-17T11:00:00Z',
  minimumPriceAgorot: 35000,
  minimumMinutes: 30,
  hourlyRateAgorot: 33000,
  designHourlyRateAgorot: 20000,
  needleOpeningCostAgorot: 7000,
  extraNeedleCostAgorot: 5000,
  estimateTables: {
    sizeBaseMinutes: { XS: 20, S: 40, M: 75, L: 120, XL: 180 },
    detail: { simple: 0.8, medium: 1.0, high: 1.35 },
    shading: { none: 1.0, light: 1.2, full: 1.45 },
    placement: { easy: 1.0, medium: 1.1, hard: 1.25 },
  },
  calibrationPoints: [{ label: 'rose', minutes: 60 }],
  autoLockSeconds: 0,
  timezone: 'Asia/Jerusalem',
};

describe('getSettings', () => {
  it('GETs /settings and returns the record', async () => {
    mockFetch.mockResolvedValue(response(200, settings));
    await expect(getSettings(api())).resolves.toEqual(settings);
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/settings`);
    expect(mockFetch.mock.calls[0][1]?.method).toBe('GET');
  });
});

describe('saveSettings', () => {
  it('PUTs the editable fields with the expected version and returns the saved record', async () => {
    const { id, createdAt, updatedAt, ...input } = settings;
    void id;
    void createdAt;
    void updatedAt;
    const changed: SettingsInput = { ...input, minimumPriceAgorot: 40000 };
    mockFetch.mockResolvedValue(response(200, { ...settings, ...changed, version: 3 }));

    const saved = await saveSettings(api(), changed);

    expect(saved.version).toBe(3);
    expect(saved.minimumPriceAgorot).toBe(40000);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/settings`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual(changed);
  });

  it('surfaces a version conflict with the current record in details', async () => {
    const { id, createdAt, updatedAt, ...input } = settings;
    void id;
    void createdAt;
    void updatedAt;
    mockFetch.mockResolvedValue(
      response(409, { error: { code: 'version_conflict', message: 'x', details: { current: settings } } }),
    );

    const error = await saveSettings(api(), input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('version_conflict');
    expect((error as ApiError).details?.current).toEqual(settings);
  });
});
