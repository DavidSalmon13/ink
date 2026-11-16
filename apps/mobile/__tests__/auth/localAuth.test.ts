// covers AC12, AC13, T2, T14 — Face ID with passcode fallback; no enrolled security → unavailable.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLocalAuth = {
  getEnrolledLevelAsync: jest.fn<() => Promise<number>>(),
  authenticateAsync: jest.fn<(options: object) => Promise<{ success: boolean; error?: string }>>(),
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
};
jest.mock('expo-local-authentication', () => mockLocalAuth, { virtual: true });

import { authenticateLocally } from '@/auth/localAuth';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authenticateLocally', () => {
  it('prompts with the message and allows the device passcode fallback', async () => {
    mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(3);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    await expect(authenticateLocally('פתיחת Ink')).resolves.toBe('success');
    expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ promptMessage: 'פתיחת Ink', disableDeviceFallback: false }),
    );
  });

  it('works with only a passcode (Expo Go: no Face ID)', async () => {
    mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(1);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
    await expect(authenticateLocally('x')).resolves.toBe('success');
  });

  it('returns failed when the user cancels or fails', async () => {
    mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(3);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    await expect(authenticateLocally('x')).resolves.toBe('failed');
  });

  it.each(['passcode_not_set', 'not_enrolled', 'not_available'])(
    'returns unavailable when iOS reports %s at prompt time',
    async (error) => {
      mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(1);
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error });
      await expect(authenticateLocally('x')).resolves.toBe('unavailable');
    },
  );

  it('returns unavailable without prompting when there is no biometrics and no passcode', async () => {
    mockLocalAuth.getEnrolledLevelAsync.mockResolvedValue(0);
    await expect(authenticateLocally('x')).resolves.toBe('unavailable');
    expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
  });
});
