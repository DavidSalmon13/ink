// covers AC12, AC13, AC16, T2, T14 — lock on cold start and on background; inactive only covers.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { LocalAuthResult } from '@/auth/localAuth';
import { useAppLock } from '@/auth/useAppLock';

let listeners: ((state: AppStateStatus) => void)[];
const authenticate = jest.fn<() => Promise<LocalAuthResult>>();

beforeEach(() => {
  listeners = [];
  authenticate.mockReset();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
    const listener = handler as (state: AppStateStatus) => void;
    if (type === 'change') listeners.push(listener);
    // remove() really unsubscribes, so tests that toggle `enabled` see the hook's actual listeners.
    const remove = () => {
      listeners = listeners.filter((l) => l !== listener);
    };
    return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function emit(state: AppStateStatus) {
  await act(async () => {
    listeners.forEach((l) => l(state));
  });
}

describe('useAppLock', () => {
  it('starts locked on cold start (content hidden before Face ID) and prompts right away; success unlocks', async () => {
    let resolve: (r: LocalAuthResult) => void = () => {};
    authenticate.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));
    expect(result.current.locked).toBe(true);

    await act(async () => resolve('success'));
    expect(result.current.locked).toBe(false);
  });

  it('stays locked when authentication fails, and unlock() prompts again', async () => {
    authenticate.mockResolvedValueOnce('failed').mockResolvedValueOnce('success');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));
    expect(result.current.locked).toBe(true);

    await act(() => result.current.unlock());

    expect(authenticate).toHaveBeenCalledTimes(2);
    expect(result.current.locked).toBe(false);
  });

  it('locks when the app goes to the background and prompts when it becomes active', async () => {
    authenticate.mockResolvedValue('success');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(result.current.locked).toBe(false));

    await emit('background');
    expect(result.current.locked).toBe(true);

    await emit('active');
    await waitFor(() => expect(result.current.locked).toBe(false));
    expect(authenticate).toHaveBeenCalledTimes(2);
  });

  it('inactive (app switcher, Face ID prompt) only covers the content and does not lock', async () => {
    authenticate.mockResolvedValue('success');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(result.current.locked).toBe(false));

    await emit('inactive');
    expect(result.current.covered).toBe(true);
    expect(result.current.locked).toBe(false);

    await emit('active');
    expect(result.current.covered).toBe(false);
    expect(result.current.locked).toBe(false);
    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it('does not start a second prompt while one is in flight', async () => {
    let resolve: (r: LocalAuthResult) => void = () => {};
    authenticate.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));

    await emit('inactive'); // the Face ID sheet itself makes the app inactive
    await emit('active');
    expect(authenticate).toHaveBeenCalledTimes(1);

    await act(async () => resolve('success'));
    expect(result.current.locked).toBe(false);
  });

  it('does not re-prompt in a loop when Face ID is cancelled (the sheet closing fires inactive -> active)', async () => {
    authenticate.mockResolvedValue('failed');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));

    await emit('inactive');
    await emit('active');

    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(result.current.locked).toBe(true);
  });

  it('prompts again after a real trip to the background, even if the last prompt was cancelled', async () => {
    authenticate.mockResolvedValueOnce('failed').mockResolvedValueOnce('success');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));

    await emit('background');
    await emit('active');

    await waitFor(() => expect(result.current.locked).toBe(false));
    expect(authenticate).toHaveBeenCalledTimes(2);
  });

  it('reports unavailable (no biometrics, no passcode) and stays locked', async () => {
    authenticate.mockResolvedValue('unavailable');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.locked).toBe(true);
  });

  it('when disabled (web preview / signed out) never locks or prompts', async () => {
    const { result } = await renderHook(() => useAppLock({ enabled: false, authenticate }));
    await emit('background');
    await emit('active');
    expect(result.current.locked).toBe(false);
    expect(result.current.covered).toBe(false);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('a fresh password sign-in (disabled -> enabled) does not lock or prompt', async () => {
    authenticate.mockResolvedValue('success');
    const { result, rerender } = await renderHook((props: { enabled: boolean }) =>
      useAppLock({ enabled: props.enabled, authenticate }), { initialProps: { enabled: false } });

    await rerender({ enabled: true });

    expect(result.current.locked).toBe(false);
    expect(authenticate).not.toHaveBeenCalled();
    // ...but it does lock from then on.
    await emit('background');
    expect(result.current.locked).toBe(true);
  });

  it('signing out clears the lock, so signing in again starts unlocked', async () => {
    authenticate.mockResolvedValue('unavailable');
    const { result, rerender } = await renderHook((props: { enabled: boolean }) =>
      useAppLock({ enabled: props.enabled, authenticate }), { initialProps: { enabled: true } });
    await waitFor(() => expect(result.current.unavailable).toBe(true));
    expect(result.current.locked).toBe(true);

    await rerender({ enabled: false }); // "כניסה עם סיסמה" signs out
    expect(result.current.locked).toBe(false);
    expect(listeners).toHaveLength(0);

    await rerender({ enabled: true }); // signed in again with the password
    expect(result.current.locked).toBe(false);
    expect(result.current.unavailable).toBe(false);
    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it('ignores a prompt result that arrives after a trip to the background', async () => {
    let resolveFirst: (r: LocalAuthResult) => void = () => {};
    authenticate
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce('failed');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));

    await emit('background');
    await emit('active'); // the old prompt is still in flight: no second prompt yet
    await act(async () => resolveFirst('success'));

    expect(result.current.locked).toBe(true);
  });

  it('treats a native error from local authentication as a failed attempt', async () => {
    authenticate.mockRejectedValueOnce(new Error('auth service failed')).mockResolvedValueOnce('success');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(authenticate).toHaveBeenCalledTimes(1));
    expect(result.current.locked).toBe(true);

    await act(() => result.current.unlock());
    expect(result.current.locked).toBe(false);
  });
});
