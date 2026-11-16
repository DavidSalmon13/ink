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

export function useAppLock(options: AppLockOptions): AppLock {
  void options;
  throw new Error('Not implemented (T14)');
}
