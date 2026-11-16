export type LocalAuthResult = 'success' | 'failed' | 'unavailable';

/** Face ID / Touch ID, falling back to the device passcode. 'unavailable' = no biometrics and no passcode. */
export async function authenticateLocally(promptMessage: string): Promise<LocalAuthResult> {
  void promptMessage;
  throw new Error('Not implemented (T14)');
}
