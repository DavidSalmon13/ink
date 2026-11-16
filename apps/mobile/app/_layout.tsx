import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { authenticateLocally } from '@/auth/localAuth';
import { LockScreen, PrivacyCover } from '@/auth/LockScreen';
import { useAppLock } from '@/auth/useAppLock';

// Keep the splash up until we know whether a session token is stored.
void SplashScreen.preventAutoHideAsync().catch(() => {});

const unlockApp = () => authenticateLocally('פתיחת Ink');

/**
 * Lock screen and app-switcher cover above the Stack, so navigation state survives a lock.
 * Mounted only once auth has loaded: signed in at mount = cold start with a stored session = locked.
 * Web preview: no lock at all (AC16).
 */
function AppLockOverlay() {
  const { status, signOut } = useAuth();
  const lock = useAppLock({ enabled: status === 'signedIn' && Platform.OS !== 'web', authenticate: unlockApp });

  if (lock.locked) {
    return (
      <LockScreen
        unavailable={lock.unavailable}
        onUnlock={() => void lock.unlock()}
        onUsePassword={() => void signOut()}
      />
    );
  }
  return lock.covered ? <PrivacyCover /> : null;
}

/** Signed out: only Login is reachable. Signed in: the app, never Login. */
function RootStack() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="index" />
          <Stack.Screen name="my-data" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      <AppLockOverlay />
    </>
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
