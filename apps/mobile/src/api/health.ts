import { API_BASE_URL } from '@/config/api';

export type ApiHealth = 'connected' | 'unreachable';

const DEFAULT_TIMEOUT_MS = 5000;

/** Calls GET /health; any error, timeout or non-UP response counts as unreachable. */
export async function checkApiHealth(
  baseUrl: string = API_BASE_URL,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ApiHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    if (!res.ok) return 'unreachable';
    const body: unknown = await res.json();
    const status = (body as { status?: unknown } | null)?.status;
    return status === 'UP' ? 'connected' : 'unreachable';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}
