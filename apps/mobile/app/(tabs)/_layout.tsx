import { Tabs } from 'expo-router/js-tabs';

import { TabBar, tabs } from '@/ui';

/** The five-tab shell (AC9): Home + four feature tabs, drawn by the design's custom bar. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
