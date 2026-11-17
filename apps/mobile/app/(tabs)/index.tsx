import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { componentMetrics, fontFace, Text, useTheme } from '@/theme';
import { Button, Card, EmptyState, Icon, IconButton, SectionHeader, type IconName } from '@/ui';
import { formatHomeDate } from '@/ui/hebrewDate';

const m = componentMetrics.home;

/** Home.html `nav[aria-label="פעולות מרכזיות"]` — the four main actions, same targets as the tab bar. */
const ACTIONS: readonly { label: string; icon: IconName; href: Href }[] = [
  { label: 'מחשבון', icon: 'calculator', href: '/calculator' },
  { label: 'ספריית סקיצות', icon: 'sketches', href: '/sketches' },
  { label: 'לקוחות', icon: 'clients', href: '/clients' },
  { label: 'יומן', icon: 'calendar', href: '/calendar' },
];

/** Home.html `nav[aria-label="ניווט משני"]` — the "עוד" grid, two per row. */
const MORE: readonly { label: string; icon: IconName }[] = [
  { label: 'גלריית עבודות', icon: 'gallery' },
  { label: 'הנתונים שלי', icon: 'myData' },
  { label: 'שיווק והודעות', icon: 'marketing' },
  { label: 'הגדרות', icon: 'settings' },
];

/**
 * The designed Home (design/pages/Home.html, app-shell AC10). "התורים הקרובים" is the empty state
 * until the Calendar epic supplies appointments. No money appears here (CLAUDE.md).
 */
export default function Home() {
  const t = useTheme();
  const c = t.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pad = t.spacing.screenPadding;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: t.spacing.xxl }}
    >
      {/* .top — date overline + wordmark, settings at the end */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: t.spacing.sm,
          minHeight: m.headerMinHeight,
          paddingTop: t.spacing.xs,
          paddingBottom: t.spacing.md,
          paddingHorizontal: pad,
        }}
      >
        <View>
          <Text variant="overline" color="textMuted" style={{ fontFamily: fontFace('700') }}>
            {formatHomeDate()}
          </Text>
          <Text variant="display" accessibilityRole="header">
            AYA INK
          </Text>
        </View>
        <IconButton icon="settings" accessibilityLabel="הגדרות" />
      </View>

      {/* .tile ×4 */}
      <View
        accessibilityLabel="פעולות מרכזיות"
        style={{ flexDirection: 'row', gap: m.gridGap, paddingHorizontal: pad }}
      >
        {ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="link"
            accessibilityLabel={action.label}
            onPress={() => router.navigate(action.href)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: m.tileMinHeight,
              alignItems: 'center',
              gap: m.tileGap,
              paddingVertical: m.tilePaddingVertical,
              paddingHorizontal: m.tilePaddingHorizontal,
              backgroundColor: c.surface,
              borderWidth: t.borderWidth.hairline,
              borderColor: c.border,
              borderRadius: t.radii.lg,
              opacity: pressed ? componentMetrics.pressedOpacity : 1,
            })}
          >
            <View
              style={{
                width: m.wellSize,
                height: m.wellSize,
                borderRadius: m.wellRadius,
                backgroundColor: c.primaryTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={action.icon} size={m.wellIconSize} color="primary" />
            </View>
            <Text style={{ fontFamily: fontFace('600'), fontSize: m.tileFontSize, color: c.text, textAlign: 'center' }}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* התורים הקרובים · היום — empty until the Calendar epic */}
      <SectionHeader
        title="התורים הקרובים · היום"
        action={<Button variant="ghost" small label="הכול" onPress={() => router.navigate('/calendar')} />}
      />
      <EmptyState
        style={{ marginHorizontal: pad }}
        title="אין תורים היום"
        action={<Button small icon="plus" label="תור חדש" onPress={() => router.navigate('/calendar')} />}
      />

      {/* עוד — secondary grid, 2 per row */}
      <SectionHeader title="עוד" />
      <View accessibilityLabel="ניווט משני" style={{ gap: m.gridGap, paddingHorizontal: pad }}>
        {[MORE.slice(0, 2), MORE.slice(2)].map((pair, row) => (
          <View key={row} style={{ flexDirection: 'row', gap: m.gridGap }}>
            {pair.map((item) => (
              <Card key={item.label} style={{ flex: 1 }}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: m.miniGap,
                    minHeight: t.spacing.rowHeight,
                    paddingHorizontal: m.miniPaddingHorizontal,
                  }}
                >
                  <Icon name={item.icon} size={m.miniIconSize} color="primary" />
                  <Text style={{ fontFamily: fontFace('500'), fontSize: m.miniFontSize, color: c.text }}>
                    {item.label}
                  </Text>
                </Pressable>
              </Card>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
