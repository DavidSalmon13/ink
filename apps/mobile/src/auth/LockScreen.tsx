import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { borderWidth, formMaxWidth, radii, spacing, touch, type, useAuthColors, type AuthColors } from '@/auth/tokens';

/**
 * The app lock and the app-switcher privacy cover. Rendered in a full-screen native Modal, so it
 * also sits above any modal or sheet screen that's open (a plain View only covers the root view).
 * No mockup: built from tokens, the primary button and ClientMode.html's lock-pill ("דורש Face ID או קוד").
 */
export function LockOverlay({
  locked,
  covered,
  unavailable,
  onUnlock,
  onUsePassword,
}: {
  locked: boolean;
  covered: boolean;
  unavailable: boolean;
  onUnlock: () => void;
  onUsePassword: () => void;
}) {
  const colors = useAuthColors();
  const styles = makeStyles(colors);

  return (
    <Modal
      visible={locked || covered}
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      {locked ? (
        <View style={styles.screen} accessibilityViewIsModal>
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
      ) : (
        // App switcher / inactive: hides the content without locking.
        <View style={styles.screen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.wordmark}>AYA INK</Text>
        </View>
      )}
    </Modal>
  );
}

function makeStyles(c: AuthColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
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
      borderWidth: borderWidth.hairline,
      borderColor: c.primary,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillText: { ...type.pill, color: c.primary },
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
