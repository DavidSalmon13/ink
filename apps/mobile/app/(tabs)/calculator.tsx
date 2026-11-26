import { useLocalSearchParams } from 'expo-router';

import { CalculatorScreen } from '@/features/calculator';

/**
 * The Calculator tab (calculator-preview spec, replacing app-shell's placeholder). An optional `quoteId` route
 * param reopens that saved quote to edit it (client-quotes AC3); without it, a fresh calculator.
 */
export default function CalculatorTab() {
  const { quoteId } = useLocalSearchParams<{ quoteId?: string }>();
  return <CalculatorScreen quoteId={quoteId} />;
}
