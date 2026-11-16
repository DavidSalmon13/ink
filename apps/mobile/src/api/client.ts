import { API_BASE_URL } from '@/config/api';

/** A non-2xx API response. `code` is the API's `error.code`, when the body has one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    message?: string,
  ) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
  }
}

/** Network failure or timeout: the request never got a response. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  getToken: () => Promise<string | null>;
  /** Called once when an authenticated request gets a 401 (expired/revoked session). */
  onUnauthorized: () => void;
}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** false = public endpoint (login): no Bearer header, and a 401 doesn't end the session. */
  auth?: boolean;
}

export interface ApiClient {
  /** Parsed JSON for 2xx with a body, undefined for 204. Throws ApiError / NetworkError. */
  apiFetch<T = unknown>(path: string, request?: ApiRequest): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 10000;

/** Reads `{ error: { code, message } }` from an error response, if it has one. */
async function readError(res: Response): Promise<{ code?: string; message?: string }> {
  try {
    const body: unknown = await res.json();
    const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    return {
      code: typeof error?.code === 'string' ? error.code : undefined,
      message: typeof error?.message === 'string' ? error.message : undefined,
    };
  } catch {
    return {};
  }
}

export function createApiClient({
  baseUrl = API_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  getToken,
  onUnauthorized,
}: ApiClientOptions): ApiClient {
  async function apiFetch<T = unknown>(
    path: string,
    { method = 'GET', body, auth = true }: ApiRequest = {},
  ): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth) {
      const token = await getToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const { code, message } = await readError(res);
      // Public endpoints (login) answer 401 for bad credentials; only an authenticated 401 ends the session.
      if (res.status === 401 && auth) onUnauthorized();
      throw new ApiError(res.status, code, message);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return { apiFetch };
}
