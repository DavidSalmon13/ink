// covers AC6, T9, T15 — API URL: EXPO_PUBLIC_API_URL → Expo hostUri → localhost.
import { describe, expect, it } from '@jest/globals';
import { resolveApiBaseUrl } from '@/config/api';

describe('resolveApiBaseUrl', () => {
  it('prefers EXPO_PUBLIC_API_URL and strips trailing slashes', () => {
    expect(resolveApiBaseUrl('https://api.example.com/', '192.168.1.20:8081')).toBe(
      'https://api.example.com',
    );
  });

  it('falls back to the LAN host from hostUri on port 8080', () => {
    expect(resolveApiBaseUrl(undefined, '192.168.1.20:8081')).toBe('http://192.168.1.20:8080');
  });

  it('ignores a blank env value', () => {
    expect(resolveApiBaseUrl('  ', '192.168.1.20:8081')).toBe('http://192.168.1.20:8080');
  });

  it('falls back to localhost when nothing is set', () => {
    expect(resolveApiBaseUrl(undefined, undefined)).toBe('http://localhost:8080');
  });
});
