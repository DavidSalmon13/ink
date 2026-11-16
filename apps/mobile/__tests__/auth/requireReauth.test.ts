// covers AC14, AC16, T2, T15 — a fresh local authentication before My Data; web preview skips it.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { LocalAuthResult } from '@/auth/localAuth';
import { requireReauth } from '@/auth/requireReauth';

const authenticate = jest.fn<() => Promise<LocalAuthResult>>();
beforeEach(() => {
  authenticate.mockReset();
});

describe('requireReauth', () => {
  it('allows on success', async () => {
    authenticate.mockResolvedValue('success');
    await expect(requireReauth(authenticate, 'ios')).resolves.toBe(true);
  });

  it.each(['failed', 'unavailable'] as const)('denies on %s', async (r) => {
    authenticate.mockResolvedValue(r);
    await expect(requireReauth(authenticate, 'ios')).resolves.toBe(false);
  });

  it('prompts every time (no remembered approval)', async () => {
    authenticate.mockResolvedValue('success');
    await requireReauth(authenticate, 'ios');
    await requireReauth(authenticate, 'ios');
    expect(authenticate).toHaveBeenCalledTimes(2);
  });

  it('on web allows without prompting', async () => {
    await expect(requireReauth(authenticate, 'web')).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
  });
});
