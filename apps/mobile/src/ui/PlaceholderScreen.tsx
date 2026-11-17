import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useTheme } from '@/theme';

import { EmptyState } from './States';

export type PlaceholderScreenProps = {
  /** The screen's Hebrew name, as on the tab bar / Home. */
  title: string;
};

/**
 * A screen whose real content arrives in a later epic (app-shell AC9/AC11). No mockup exists for it,
 * so it's built only from existing pieces: the title1 heading and the design-system empty state.
 */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + t.spacing.xs,
        paddingHorizontal: t.spacing.screenPadding,
        paddingBottom: t.spacing.xxl,
        gap: t.spacing.lg,
      }}
    >
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      <EmptyState title="בקרוב" message="המסך הזה ייבנה בשלב הבא." />
    </ScrollView>
  );
}
