import { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { checkApiHealth, type ApiHealth } from '@/api/health';
import { useAuth } from '@/auth/AuthProvider';
import { API_BASE_URL } from '@/config/api';
import { Text } from '@/theme';
import { Button, PlaceholderScreen } from '@/ui';

type Status = ApiHealth | 'checking';

const LABELS: Record<Status, string> = {
  checking: 'API: checking…',
  connected: 'API: connected',
  unreachable: 'API: unreachable',
};

/**
 * Settings placeholder (app-shell AC11). Not a tab: reached from Home's settings button and "עוד".
 * TEMPORARY: until the Settings epic, it also hosts owner-auth-lock's logout (T16) and the developer
 * API-status line that used to sit on the placeholder Home.
 */
export default function Settings() {
  const { signOut } = useAuth();
  const [status, setStatus] = useState<Status>('checking');
  const [signingOut, setSigningOut] = useState(false);

  const logout = useCallback(() => {
    setSigningOut(true);
    void signOut();
  }, [signOut]);

  useEffect(() => {
    let active = true;
    checkApiHealth().then((result) => {
      if (active) setStatus(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const runCheck = useCallback(async () => {
    setStatus('checking');
    setStatus(await checkApiHealth());
  }, []);

  return (
    <PlaceholderScreen title="הגדרות">
      <Button variant="secondary" block label="התנתקות" loading={signingOut} onPress={logout} />
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Checks the API connection again"
        onPress={runCheck}
        disabled={status === 'checking'}
      >
        <Text testID="api-status" variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
          {LABELS[status]}
        </Text>
      </Pressable>
      <Text variant="caption" color="textMuted" style={{ textAlign: 'center' }}>
        {API_BASE_URL}
      </Text>
    </PlaceholderScreen>
  );
}
