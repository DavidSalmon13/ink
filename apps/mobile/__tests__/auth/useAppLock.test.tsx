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
    if (type === 'change') listeners.push(handler as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
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
  it('starts locked on cold start and prompts right away; success unlocks', async () => {
    authenticate.mockResolvedValue('success');
    const { result } = await renderHook(() => useAppLock({ enabled: true, authenticate }));
    await waitFor(() => expect(result.current.locked).toBe(false));
    expect(authenticate).toHaveBeenCalledTimes(1);
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
});
