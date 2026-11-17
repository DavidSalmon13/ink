import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { componentMetrics as m, fontFace, layout, spacing, Text, useTheme, type Theme } from '@/theme';
import { Button } from '@/ui';

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
  const theme = useTheme();
  const styles = makeStyles(theme);

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
          <Text variant="display" accessibilityRole="header">
            AYA INK
          </Text>
          {unavailable ? (
            <View style={styles.stack}>
              <Text variant="callout" color="textMuted" style={styles.message}>אין במכשיר Face ID או קוד גישה. אפשר להיכנס שוב עם הסיסמה.</Text>
              <Button label="כניסה עם סיסמה" onPress={onUsePassword} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="פתיחה — דורש Face ID או קוד"
              onPress={onUnlock}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              <Text variant="callout" color="primary" style={styles.pillText}>
                פתיחה
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        // App switcher / inactive: hides the content without locking.
        <View style={styles.screen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text variant="display">AYA INK</Text>
        </View>
      )}
    </Modal>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxl,
      paddingHorizontal: spacing.screenPadding,
    },
    stack: { alignItems: 'center', gap: spacing.lg, maxWidth: layout.modalMaxWidth.tablet },
    message: { textAlign: 'center' },
    pill: {
      minHeight: t.touch.buttonHeight,
      paddingHorizontal: spacing.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.colors.primary,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: m.pressedOpacity },
    // ClientMode.html `.lock-pill`: 14px / 600.
    pillText: { fontFamily: fontFace('600') },
  });
}
