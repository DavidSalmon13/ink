import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authenticateLocally } from '@/auth/localAuth';
import { requireReauth } from '@/auth/requireReauth';
import { spacing, type, useAuthColors } from '@/auth/tokens';
import { useIsAppLocked } from '@/auth/useAppLock';

/**
 * "My Data" placeholder behind a fresh local authentication on every open (AC14), even when the
 * app is unlocked. The real screen and its entry point on Home arrive with later specs.
 */
export default function MyData() {
  const router = useRouter();
  const colors = useAuthColors();
  const [allowed, setAllowed] = useState(false);
  // Opened under the app lock (e.g. a deep link on cold start): wait for the unlock, so the two
  // Face ID prompts don't overlap. Once allowed, an app re-lock doesn't ask a second time.
  const appLocked = useIsAppLocked();

  useEffect(() => {
    if (appLocked || allowed) return;
    let active = true;
    requireReauth(() => authenticateLocally('פתיחת הנתונים שלי'))
      // A native error counts as a failed check: leave the screen.
      .catch(() => false)
      .then((ok) => {
        if (!active) return;
        if (ok) {
          setAllowed(true);
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      });
    return () => {
      active = false;
    };
  }, [appLocked, allowed, router]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {allowed && (
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          הנתונים שלי
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.screenPadding },
  title: type.title1,
});
