import * as LocalAuthentication from 'expo-local-authentication';

export type LocalAuthResult = 'success' | 'failed' | 'unavailable';

/** iOS errors meaning the device can't authenticate at all (as opposed to a cancel or a wrong face). */
const UNAVAILABLE_ERRORS = new Set(['passcode_not_set', 'not_enrolled', 'not_available']);

/** Face ID / Touch ID, falling back to the device passcode. 'unavailable' = no biometrics and no passcode. */
export async function authenticateLocally(promptMessage: string): Promise<LocalAuthResult> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return 'unavailable';

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'ביטול',
    disableDeviceFallback: false,
  });
  if (result.success) return 'success';
  return UNAVAILABLE_ERRORS.has(result.error) ? 'unavailable' : 'failed';
}
