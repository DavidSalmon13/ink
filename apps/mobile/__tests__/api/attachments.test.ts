// covers api-conventions AC10, T11 — attachment helpers: request upload, PUT bytes, download URL, delete.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, createApiClient, NetworkError } from '@/api/client';
import {
  deleteAttachment,
  getDownloadUrl,
  requestUpload,
  uploadAttachment,
  uploadBytes,
  type Attachment,
} from '@/api/attachments';

const BASE = 'http://api.test';
const UPLOAD_URL = 'http://store.test/ink-attachments/attachments/a1?X-Amz-Expires=900';
const ID = '6f1c2c1e-0000-4000-8000-0000000000a1';
const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const api = () => createApiClient({ baseUrl: BASE, getToken: async () => 'tok', onUnauthorized: () => {} });

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function headersOf(call: number): Record<string, string> {
  return Object.fromEntries(new Headers(mockFetch.mock.calls[call][1]?.headers).entries());
}

const attachment: Attachment = {
  id: ID,
  version: 0,
  createdAt: '2026-11-17T10:00:00Z',
  updatedAt: '2026-11-17T10:00:00Z',
  kind: 'sketch',
  mimeType: 'image/png',
  sizeBytes: 4,
  width: 800,
  height: 600,
  uploadUrl: UPLOAD_URL,
};

const meta = { kind: 'sketch', mimeType: 'image/png', sizeBytes: 4, width: 800, height: 600 } as const;

describe('requestUpload', () => {
  it('PUTs the metadata to /attachments/{id} with auth and returns the record with its upload URL', async () => {
    mockFetch.mockResolvedValue(json(200, attachment));

    await expect(requestUpload(api(), ID, meta)).resolves.toEqual(attachment);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`${BASE}/attachments/${ID}`);
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual(meta);
    expect(headersOf(0).authorization).toBe('Bearer tok');
  });
});

describe('uploadBytes', () => {
  it('PUTs the bytes to the presigned URL with the content type and no Authorization header', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
    const bytes = new Uint8Array([1, 2, 3, 4]);

    await uploadBytes(UPLOAD_URL, bytes, 'image/png');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(UPLOAD_URL);
    expect(init?.method).toBe('PUT');
    expect(init?.body).toBe(bytes);
    expect(headersOf(0)['content-type']).toBe('image/png');
    expect(headersOf(0).authorization).toBeUndefined();
  });

  it('throws ApiError with the status when the store rejects the upload', async () => {
    mockFetch.mockResolvedValue(new Response('<Error/>', { status: 403 }));
    const error = await uploadBytes(UPLOAD_URL, new Uint8Array([1]), 'image/png').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(403);
  });

  it('throws NetworkError when the upload never gets a response', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(uploadBytes(UPLOAD_URL, new Uint8Array([1]), 'image/png')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('uploadAttachment', () => {
  it('requests the upload, then PUTs the bytes to the returned URL', async () => {
    mockFetch.mockResolvedValueOnce(json(200, attachment)).mockResolvedValueOnce(new Response(null, { status: 200 }));
    const bytes = new Uint8Array([1, 2, 3, 4]);

    await expect(uploadAttachment(api(), ID, meta, bytes)).resolves.toEqual(attachment);

    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([`${BASE}/attachments/${ID}`, UPLOAD_URL]);
  });
});

describe('getDownloadUrl', () => {
  it('GETs /attachments/{id}/download-url and returns the URL', async () => {
    mockFetch.mockResolvedValue(json(200, { downloadUrl: 'http://store.test/x?sig' }));

    await expect(getDownloadUrl(api(), ID)).resolves.toBe('http://store.test/x?sig');
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/attachments/${ID}/download-url`);
  });
});

describe('deleteAttachment', () => {
  it('DELETEs /attachments/{id}', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteAttachment(api(), ID)).resolves.toBeUndefined();
    expect(mockFetch.mock.calls[0][0]).toBe(`${BASE}/attachments/${ID}`);
    expect(mockFetch.mock.calls[0][1]?.method).toBe('DELETE');
  });
});
