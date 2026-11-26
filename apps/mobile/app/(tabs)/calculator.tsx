import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';

import { CalculatorScreen } from '@/features/calculator';

/**
 * The Calculator tab (calculator-preview spec, replacing app-shell's placeholder). An optional `quoteId` route
 * param reopens that saved quote to edit it (client-quotes AC3); without it, a fresh calculator. Coming back to
 * the Calculator tab from another tab drops the param, so the tab leads to a fresh calculator after a reopen.
 * Tapping the tab while already on it does nothing, so unsaved edits to a reopened quote aren't thrown away.
 */
export default function CalculatorTab() {
  const { quoteId } = useLocalSearchParams<{ quoteId?: string }>();
  const navigation = useNavigation();

  useEffect(() => {
    if (!quoteId) return undefined;
    // The screen's own navigation, not router.setParams: the press fires before the tab is focused, and the
    // global router would clear the param on whichever screen is focused (the tab being left).
    return navigation.addListener('tabPress' as never, () => {
      if (!navigation.isFocused()) navigation.setParams({ quoteId: undefined } as never);
    });
  }, [navigation, quoteId]);

  return <CalculatorScreen quoteId={quoteId} />;
}
