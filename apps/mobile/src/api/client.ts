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

export function createApiClient(options: ApiClientOptions): ApiClient {
  void options;
  void API_BASE_URL;
  throw new Error('Not implemented (T11)');
}
