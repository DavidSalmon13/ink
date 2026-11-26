import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { CalculatorScreen } from '@/features/calculator';

/**
 * The Calculator tab (calculator-preview spec, replacing app-shell's placeholder). An optional `quoteId` route
 * param reopens that saved quote to edit it (client-quotes AC3); without it, a fresh calculator. Pressing the
 * Calculator tab drops the param, so the tab always leads back to a fresh calculator after a reopen.
 */
export default function CalculatorTab() {
  const { quoteId } = useLocalSearchParams<{ quoteId?: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    if (!quoteId) return undefined;
    return navigation.addListener('tabPress' as never, () => router.setParams({ quoteId: undefined }));
  }, [navigation, router, quoteId]);

  return <CalculatorScreen quoteId={quoteId} />;
}
