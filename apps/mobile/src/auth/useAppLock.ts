import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { LocalAuthResult } from '@/auth/localAuth';

export interface AppLockOptions {
  /** false on web and when signed out: never locks. */
  enabled: boolean;
  authenticate: () => Promise<LocalAuthResult>;
}

export interface AppLock {
  /** Content is hidden until local authentication succeeds. */
  locked: boolean;
  /** App switcher / inactive: content hidden by a privacy cover, but not locked. */
  covered: boolean;
  /** The device has no biometrics and no passcode: offer password sign-in instead. */
  unavailable: boolean;
  /** Prompt again (e.g. the user tapped the unlock button). */
  unlock(): Promise<void>;
}

/**
 * Prompts on cold start and when the app returns from `background`. It does NOT prompt on
 * inactive -> active (the Face ID sheet itself, Control Center, the app switcher): after a cancel
 * that would loop. A locked user retries with unlock().
 *
 * Mounted enabled = cold start with a stored session, so it starts locked. Becoming enabled later
 * (a fresh password sign-in) does not lock: she has just authenticated.
 */
export function useAppLock({ enabled, authenticate }: AppLockOptions): AppLock {
  const [locked, setLocked] = useState(enabled);
  const [covered, setCovered] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  // Signing out clears the lock, so the next sign-in starts unlocked.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    if (!enabled) {
      setLocked(false);
      setCovered(false);
      setUnavailable(false);
    }
  }

  const inFlight = useRef(false);
  const wentToBackground = useRef(false);

  const prompt = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await authenticate();
      if (result === 'success') {
        setLocked(false);
        setUnavailable(false);
      } else if (result === 'unavailable') {
        setUnavailable(true);
      }
    } finally {
      inFlight.current = false;
    }
  }, [authenticate]);

  // Cold start: prompt right away. Runs once, with the value enabled had at mount.
  const enabledAtMount = useRef(enabled);
  useEffect(() => {
    if (enabledAtMount.current) void prompt();
  }, [prompt]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wentToBackground.current = true;
        setLocked(true);
      } else if (state === 'inactive') {
        setCovered(true);
      } else if (state === 'active') {
        setCovered(false);
        if (wentToBackground.current) {
          wentToBackground.current = false;
          void prompt();
        }
      }
    });
    return () => subscription.remove();
  }, [enabled, prompt]);

  return {
    locked: enabled && locked,
    covered: enabled && covered,
    unavailable: enabled && unavailable,
    unlock: prompt,
  };
}
