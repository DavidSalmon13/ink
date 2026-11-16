import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { authenticateLocally } from '@/auth/localAuth';
import { requireReauth } from '@/auth/requireReauth';
import { spacing, useAuthColors } from '@/auth/tokens';

/**
 * "My Data" placeholder behind a fresh local authentication on every open (AC14), even when the
 * app is unlocked. The real screen and its entry point on Home arrive with later specs.
 */
export default function MyData() {
  const router = useRouter();
  const colors = useAuthColors();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    requireReauth(() => authenticateLocally('פתיחת הנתונים שלי')).then((ok) => {
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
  }, [router]);

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
  // tokens.json typography.scale.title1
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
});
