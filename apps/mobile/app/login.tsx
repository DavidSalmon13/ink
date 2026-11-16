import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthError, type AuthErrorCode } from '@/auth/authApi';
import { useAuth } from '@/auth/AuthProvider';
import {
  borderWidth,
  cardShadow,
  formMaxWidth,
  radii,
  spacing,
  touch,
  type,
  useAuthColors,
  type AuthColors,
} from '@/auth/tokens';

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'אימייל או סיסמה שגויים',
  rate_limited: 'יותר מדי ניסיונות. אפשר לנסות שוב מאוחר יותר',
  network: 'אין חיבור לשרת. אפשר לנסות שוב',
  unknown: 'משהו השתבש. אפשר לנסות שוב',
};

/** Owner login. No mockup: built from design-system fields, primary button and card (spec references.md). */
export default function Login() {
  const { signIn } = useAuth();
  const colors = useAuthColors();
  const styles = makeStyles(colors);

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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text style={styles.wordmark} accessibilityRole="header">
            AYA INK
          </Text>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>אימייל</Text>
              <TextInput
                accessibilityLabel="אימייל"
                style={[styles.input, error === 'invalid_credentials' && styles.inputError]}
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
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>סיסמה</Text>
              <TextInput
                accessibilityLabel="סיסמה"
                style={[styles.input, error === 'invalid_credentials' && styles.inputError]}
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
            </View>

            {error && (
              <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
                {ERROR_MESSAGES[error]}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              disabled={!canSubmit}
              onPress={submit}
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
              {submitting && <ActivityIndicator size="small" color={colors.textMuted} />}
              <Text style={[styles.buttonText, !canSubmit && styles.buttonTextDisabled]}>כניסה</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: AuthColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.screenPadding,
      paddingVertical: spacing.xxxl,
    },
    column: { width: '100%', maxWidth: formMaxWidth, alignSelf: 'center', gap: spacing.xxl },
    wordmark: { ...type.display, color: c.text, textAlign: 'center' },
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: borderWidth.hairline,
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.lg,
      shadowColor: c.shadow,
      ...cardShadow,
    },
    field: { gap: 6 },
    label: { ...type.label, color: c.textMuted },
    input: {
      minHeight: touch.inputHeight,
      paddingHorizontal: 14,
      borderWidth: borderWidth.hairline,
      borderColor: c.borderStrong,
      borderRadius: radii.md,
      backgroundColor: c.surface,
      color: c.text,
      ...type.input,
    },
    inputError: { borderColor: c.danger, borderWidth: borderWidth.strong },
    error: { ...type.label, color: c.danger },
    button: {
      minHeight: touch.buttonHeight,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      backgroundColor: c.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    buttonDisabled: { backgroundColor: c.surfaceAlt },
    buttonText: { ...type.button, color: c.onPrimary },
    buttonTextDisabled: { color: c.textMuted },
  });
}
