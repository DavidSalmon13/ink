import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';

import { componentMetrics as m, fontFace, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';

/**
 * The five tabs in Home.html order (בית first). With forced RTL the first item sits on the right,
 * which is the mockup's order. Keys are the route names under app/(tabs)/.
 */
export const tabs = [
  { name: 'index', label: 'בית', icon: 'home' },
  { name: 'calculator', label: 'מחשבון', icon: 'calculator' },
  { name: 'sketches', label: 'סקיצות', icon: 'sketches' },
  { name: 'clients', label: 'לקוחות', icon: 'clients' },
  { name: 'calendar', label: 'יומן', icon: 'calendar' },
] as const satisfies readonly { name: string; label: string; icon: IconName }[];

export type TabName = (typeof tabs)[number]['name'];

/** Home.html `.tabbar` — fixed bottom bar; the active tab is primary and bold. */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const t = useTheme();
  const c = t.colors;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="ניווט ראשי"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: m.tabBar.padding,
        paddingHorizontal: m.tabBar.padding,
        paddingBottom: Math.max(insets.bottom, m.tabBar.padding),
        backgroundColor: c.surface,
        borderTopWidth: t.borderWidth.hairline,
        borderTopColor: c.border,
        zIndex: t.zIndex.tabBar,
      }}
    >
      {tabs.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) return null;
        const focused = state.routes[state.index]?.key === route.key;
        const color = focused ? c.primary : c.textMuted;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={{
              alignItems: 'center',
              gap: m.tabBar.itemGap,
              minWidth: m.tabBar.itemMinWidth,
              minHeight: t.touch.minTarget,
            }}
          >
            <Icon name={tab.icon} size={m.tabBar.iconSize} tint={color} />
            <Text style={{ fontFamily: fontFace(focused ? '700' : '500'), fontSize: m.tabBar.fontSize, color }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
