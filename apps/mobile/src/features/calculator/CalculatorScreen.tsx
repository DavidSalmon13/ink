import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useTheme } from '@/theme';
import { ErrorState, LoadingState } from '@/ui';

import { useSettings } from './useSettings';

/**
 * iPad and up center the iPhone composition in the pane — there is no Calculator.ipad.html, so the
 * layout is the iPhone one capped and centered (recorded as a deviation in the spec Changelog).
 */
export const CALC_MAX_WIDTH = 440;
const WIDE_MIN_WIDTH = 768;

/**
 * The Calculator tab (Calculator.html). Loads the seeded Settings and shows the shared loading and
 * error states (an error offers retry); once loaded it prices the visit. The item editor, the
 * "אפשרויות נוספות" options and the summary are composed onto the loaded branch by T5/T6.
 */
export function CalculatorScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const settings = useSettings();

  let body = null;
  if (settings.data === undefined) {
    body = settings.isError ? (
      <ErrorState title="לא הצלחנו לטעון את המחירון" onRetry={() => void settings.refetch()} />
    ) : (
      <LoadingState />
    );
  }
  // else: settings loaded — T5/T6 render the items, options and summary here from settings.data.

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top + t.spacing.xs }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + t.spacing.xxxl }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: width >= WIDE_MIN_WIDTH ? CALC_MAX_WIDTH : undefined,
            alignSelf: 'center',
            paddingHorizontal: t.spacing.screenPadding,
          }}
        >
          <View style={{ paddingTop: t.spacing.sm, paddingBottom: t.spacing.md }}>
            <Text variant="overline" color="textMuted">
              הצעת מחיר לביקור
            </Text>
            <Text variant="title1" accessibilityRole="header">
              מחשבון
            </Text>
          </View>
          {body}
        </View>
      </ScrollView>
    </View>
  );
}
