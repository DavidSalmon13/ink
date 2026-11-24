// covers client-list AC1, AC3, AC5, T3; client-card AC4, AC7, T2 — typed /clients helpers.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, createApiClient } from '@/api/client';
import {
  deleteClient,
  getClient,
  getClientSummary,
  listClients,
  postConsent,
  putClient,
  type Client,
} from '@/api/clients';

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

const ID = '6f1c2c1e-0000-4000-8000-0000000000c1';
const maya: Client = {
  id: ID,
  version: 2,
  createdAt: '2026-11-18T10:00:00Z',
  updatedAt: '2026-11-18T11:00:00Z',
  name: 'מאיה לוי',
  phone: '054-381-2290',
  email: null,
  instagram: 'maya.lines',
  notes: null,
  tattooCount: 3,
  marketingConsent: 'none',
  consentUpdatedAt: null,
};

describe('listClients', () => {
  it('GETs /clients without a query', async () => {
    mockFetch.mockResolvedValue(response(200, [maya]));
    await expect(listClients(api())).resolves.toEqual([maya]);
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/clients`);
    expect(mockFetch.mock.calls[0][1]?.method).toBe('GET');
  });

  it('sends a trimmed, URL-encoded q', async () => {
    mockFetch.mockResolvedValue(response(200, []));
    await listClients(api(), '  דן כהן ');
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/clients?q=${encodeURIComponent('דן כהן')}`);
  });

  it('omits a blank q', async () => {
    mockFetch.mockResolvedValue(response(200, []));
    await listClients(api(), '   ');
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/clients`);
  });
});

describe('getClient', () => {
  it('GETs /clients/{id}', async () => {
    mockFetch.mockResolvedValue(response(200, maya));
    await expect(getClient(api(), ID)).resolves.toEqual(maya);
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/clients/${ID}`);
  });
});

describe('putClient', () => {
  it('creates without a version', async () => {
    mockFetch.mockResolvedValue(response(200, { ...maya, version: 0 }));
    await putClient(api(), ID, { name: 'מאיה לוי' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/clients/${ID}`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'מאיה לוי' });
  });

  it('sends the last-seen version when editing', async () => {
    mockFetch.mockResolvedValue(response(200, { ...maya, version: 3 }));
    await putClient(api(), ID, { name: 'מאיה לוי', phone: '052-111-2233', version: 2 });
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      name: 'מאיה לוי',
      phone: '052-111-2233',
      version: 2,
    });
  });

  it('surfaces a stale version as ApiError version_conflict with details.current', async () => {
    const current = { ...maya, version: 3, name: 'מאיה לוי-כהן' };
    mockFetch.mockResolvedValue(
      response(409, { error: { code: 'version_conflict', message: 'Version conflict', details: { current } } }),
    );
    const err = await putClient(api(), ID, { name: 'מאיה', version: 2 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('version_conflict');
    expect((err as ApiError).details?.current).toEqual(current);
  });
});

describe('deleteClient', () => {
  it('DELETEs /clients/{id} and resolves on 204', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteClient(api(), ID)).resolves.toBeUndefined();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/clients/${ID}`);
    expect(init?.method).toBe('DELETE');
  });
});

describe('getClientSummary', () => {
  it('GETs /clients/{id}/summary', async () => {
    const summary = { tattooCount: 0, completedIncomeAgorot: 0, nextAppointmentAt: null };
    mockFetch.mockResolvedValue(response(200, summary));
    await expect(getClientSummary(api(), ID)).resolves.toEqual(summary);
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/clients/${ID}/summary`);
  });
});

describe('postConsent', () => {
  it('POSTs the action to /clients/{id}/consent and returns the updated client', async () => {
    const updated = { ...maya, version: 3, marketingConsent: 'granted', consentUpdatedAt: '2026-10-01T22:30:00Z' };
    mockFetch.mockResolvedValue(response(200, updated));

    await expect(postConsent(api(), ID, 'granted')).resolves.toEqual(updated);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/clients/${ID}/consent`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ action: 'granted' });
  });
});
