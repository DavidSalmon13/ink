import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AuthError, type AuthErrorCode } from '@/auth/authApi';
import { useAuth } from '@/auth/AuthProvider';
import { componentMetrics as m, fontFace, layout, spacing, Text, useColors } from '@/theme';
import { Button, Card, Field } from '@/ui';

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'אימייל או סיסמה שגויים',
  rate_limited: 'יותר מדי ניסיונות. אפשר לנסות שוב מאוחר יותר',
  network: 'אין חיבור לשרת. אפשר לנסות שוב',
  unknown: 'משהו השתבש. אפשר לנסות שוב',
};

/** Owner login. No mockup: built from design-system fields, primary button and card (spec references.md). */
export default function Login() {
  const { signIn } = useAuth();
  const colors = useColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const canSubmit = email.trim() !== '' && password !== '' && !submitting;

  // Handlers start the request and return nothing: callers (Pressable, tests) shouldn't wait on sign-in.
  function submit() {
    void runSignIn();
  }

  async function runSignIn() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      // On success the layout guard swaps this screen for the app; nothing else to do here.
    } catch (e) {
      setError(e instanceof AuthError ? e.code : 'unknown');
      setSubmitting(false);
    }
  }

  const invalid = error === 'invalid_credentials';

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text variant="display" style={styles.wordmark} accessibilityRole="header">
            AYA INK
          </Text>

          <Card style={styles.card}>
            <Field
              label="אימייל"
              invalid={invalid}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              editable={!submitting}
            />

            <Field
              label="סיסמה"
              invalid={invalid}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              editable={!submitting}
            />

            {error && (
              <Text
                color="danger"
                style={styles.error}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {ERROR_MESSAGES[error]}
              </Text>
            )}

            <Button label="כניסה" onPress={submit} disabled={!canSubmit} loading={submitting} />
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xxxl,
  },
  // modalMaxWidth.tablet keeps the form a readable width on iPad.
  column: { width: '100%', maxWidth: layout.modalMaxWidth.tablet, alignSelf: 'center', gap: spacing.xxl },
  wordmark: { textAlign: 'center' },
  card: { padding: spacing.lg, gap: spacing.lg },
  // design-system.html `.helper.error`: 13px / 600.
  error: { fontFamily: fontFace('600'), fontSize: m.field.helperFontSize },
});
