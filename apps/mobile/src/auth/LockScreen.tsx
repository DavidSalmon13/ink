import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formMaxWidth, radii, spacing, touch, type, useAuthColors, type AuthColors } from '@/auth/tokens';

/** tokens.json zIndex.lock: above everything, including modals and toasts. */
const LOCK_Z = 300;

/**
 * Full-screen lock above the navigation stack (so its state is kept). No mockup: built from tokens,
 * the primary button and ClientMode.html's lock-pill ("דורש Face ID או קוד").
 */
export function LockScreen({
  unavailable,
  onUnlock,
  onUsePassword,
}: {
  unavailable: boolean;
  onUnlock: () => void;
  onUsePassword: () => void;
}) {
  const colors = useAuthColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Text style={styles.wordmark} accessibilityRole="header">
        AYA INK
      </Text>
      {unavailable ? (
        <View style={styles.stack}>
          <Text style={styles.message}>אין במכשיר Face ID או קוד גישה. אפשר להיכנס שוב עם הסיסמה.</Text>
          <Pressable accessibilityRole="button" onPress={onUsePassword} style={styles.button}>
            <Text style={styles.buttonText}>כניסה עם סיסמה</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="פתיחה — דורש Face ID או קוד"
          onPress={onUnlock}
          style={styles.pill}
        >
          <Text style={styles.pillText}>פתיחה</Text>
        </Pressable>
      )}
    </View>
  );
}

/** App switcher / inactive: hides the content without locking. */
export function PrivacyCover() {
  const styles = makeStyles(useAuthColors());
  return (
    <View style={styles.overlay} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.wordmark}>AYA INK</Text>
    </View>
  );
}

function makeStyles(c: AuthColors) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: LOCK_Z,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxl,
      paddingHorizontal: spacing.screenPadding,
    },
    wordmark: { ...type.display, color: c.text },
    stack: { alignItems: 'center', gap: spacing.lg, maxWidth: formMaxWidth },
    message: { ...type.callout, color: c.textMuted, textAlign: 'center' },
    pill: {
      minHeight: touch.buttonHeight,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillText: { fontSize: 14, fontWeight: '600', color: c.primary },
    button: {
      minHeight: touch.buttonHeight,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { ...type.button, color: c.onPrimary },
  });
}
