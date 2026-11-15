import Constants from 'expo-constants';

const API_PORT = 8080;
const LOCAL_FALLBACK = `http://localhost:${API_PORT}`;

/**
 * Resolves the API base URL (no trailing slash):
 * 1. EXPO_PUBLIC_API_URL, if set (deployed environments, or a manual override).
 * 2. The dev machine's LAN host from Expo's hostUri, so Expo Go on a phone
 *    reaches the API running on the Mac without code edits.
 * 3. http://localhost:8080 (web preview and the iOS Simulator).
 */
export function resolveApiBaseUrl(
  envUrl: string | undefined = process.env.EXPO_PUBLIC_API_URL,
  hostUri: string | undefined = Constants.expoConfig?.hostUri,
): string {
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:${API_PORT}`;
  }
  return LOCAL_FALLBACK;
}

export const API_BASE_URL = resolveApiBaseUrl();
