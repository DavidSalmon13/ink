import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { authenticateLocally } from '@/auth/localAuth';
import { LockOverlay } from '@/auth/LockScreen';
import { AppLockContext, useAppLock } from '@/auth/useAppLock';

// Keep the splash up until we know whether a session token is stored.
void SplashScreen.preventAutoHideAsync().catch(() => {});

const unlockApp = () => authenticateLocally('פתיחת Ink');

/**
 * Lock screen and app-switcher cover above the app, so navigation state survives a lock.
 * Mounted only once auth has loaded: signed in at mount = cold start with a stored session = locked.
 * Web preview: no lock at all (AC16).
 */
function AppLockGate({ children }: { children: ReactNode }) {
  const { status, signOut } = useAuth();
  const lock = useAppLock({ enabled: status === 'signedIn' && Platform.OS !== 'web', authenticate: unlockApp });

  return (
    <AppLockContext.Provider value={lock.locked}>
      {children}
      <LockOverlay
        locked={lock.locked}
        covered={lock.covered}
        unavailable={lock.unavailable}
        onUnlock={() => void lock.unlock()}
        onUsePassword={() => void signOut()}
      />
    </AppLockContext.Provider>
  );
}

/** Signed out: only Login is reachable. Signed in: the app, never Login. */
function RootStack() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') return null;

  return (
    <AppLockGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="index" />
          <Stack.Screen name="my-data" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </AppLockGate>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootStack />
    </AuthProvider>
  );
}
