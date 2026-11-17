import { Tabs } from 'expo-router/js-tabs';

import { TabBar, tabs } from '@/ui';

/**
 * Placeholder screens reached from Home (AC11). They live in the tab group so the bar stays visible,
 * but TabBar only draws the five `tabs`, so they never appear as tabs.
 */
const hiddenScreens = ['settings', 'gallery', 'marketing'] as const;

/** The five-tab shell (AC9): Home + four feature tabs, drawn by the design's custom bar. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
      {hiddenScreens.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
