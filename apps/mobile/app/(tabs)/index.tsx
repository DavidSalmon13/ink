import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { checkApiHealth, type ApiHealth } from '@/api/health';
import { useAuth } from '@/auth/AuthProvider';
import { useAuthColors } from '@/auth/tokens';
import { API_BASE_URL } from '@/config/api';

type Status = ApiHealth | 'checking';

const LABELS: Record<Status, string> = {
  checking: 'API: checking…',
  connected: 'API: connected',
  unreachable: 'API: unreachable',
};

/** Developer placeholder until app-shell replaces it with the designed Home screen. */
export default function Index() {
  const [status, setStatus] = useState<Status>('checking');
  const { signOut } = useAuth();
  const colors = useAuthColors();
  const [signingOut, setSigningOut] = useState(false);

  // TEMPORARY (owner-auth-lock T16): logout lives here until the Settings screen exists.
  const logout = useCallback(() => {
    setSigningOut(true);
    void signOut();
  }, [signOut]);

  // Initial check on mount; status starts as 'checking'.
  useEffect(() => {
    let active = true;
    checkApiHealth().then((result) => {
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);

  // Manual re-check when the status is tapped.
  const runCheck = useCallback(async () => {
    setStatus('checking');
    setStatus(await checkApiHealth());
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ink</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Checks the API connection again"
        onPress={runCheck}
        disabled={status === 'checking'}
      >
        <Text testID="api-status" style={styles.status}>
          {LABELS[status]}
        </Text>
      </Pressable>
      <Text style={styles.url}>{API_BASE_URL}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: signingOut, busy: signingOut }}
        disabled={signingOut}
        onPress={logout}
        style={[styles.logout, { borderColor: colors.primary }]}
      >
        <Text style={[styles.logoutText, { color: colors.primary }]}>התנתקות</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingStart: 24,
    paddingEnd: 24,
    gap: 12,
  },
  title: { fontSize: 32, fontWeight: '600' },
  status: { fontSize: 16 },
  url: { fontSize: 12, opacity: 0.6 },
  // design-system.html .btn-secondary
  logout: {
    marginTop: 24,
    minHeight: 44,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
});
