import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { checkApiHealth, type ApiHealth } from '@/api/health';
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
});
