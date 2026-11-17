import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  useFonts,
} from '@expo-google-fonts/heebo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { authenticateLocally } from '@/auth/localAuth';
import { LockOverlay } from '@/auth/LockScreen';
import { AppLockContext, useAppLock } from '@/auth/useAppLock';
import { ToastProvider } from '@/ui';

// Ink is Hebrew-only: lay everything out right-to-left (owner-auth-lock AC10 deferred this here).
// On a device the first launch after this applies needs one reload; see the app-shell QA notes.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Keep the splash up until the Heebo faces are loaded and we know whether a session token is stored.
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

/**
 * Signed out: only Login is reachable. Signed in: the app, never Login.
 * `fontsReady` is true once Heebo has loaded or failed to (then the system font is used, not a stuck splash).
 */
function RootStack({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useAuth();
  const ready = fontsReady && status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <AppLockGate>
      {/* Inside the lock gate, so the lock overlay still covers any toast. */}
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={status === 'signedIn'}>
            <Stack.Screen name="index" />
            <Stack.Screen name="my-data" />
          </Stack.Protected>
          <Stack.Protected guard={status === 'signedOut'}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </ToastProvider>
    </AppLockGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold });

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootStack fontsReady={fontsLoaded || fontError != null} />
    </AuthProvider>
  );
}
