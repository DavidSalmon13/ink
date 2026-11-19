import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClientCard, ClientFormModal, ClientsList, WIDE_MIN_WIDTH } from '@/features/clients';
import { useTheme } from '@/theme';
import { EmptyState } from '@/ui';

/** ClientCard.ipad.html `.side`: the list pane is 340px wide (about a third of the 1180px landscape iPad). */
const LIST_PANE_WIDTH = 340;

/**
 * The Clients tab (client-list + client-card AC1). iPhone: the list, and a row pushes the card route.
 * iPad (width ≥ 768): the list pane beside the card pane (ClientCard.ipad.html), with the chosen row
 * highlighted. "לקוח חדש" opens the create modal; editing happens from the card.
 */
export default function ClientsTab() {
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_MIN_WIDTH;
  const [selected, setSelected] = useState<string | null>(null);
  // 0 = closed; bumped per open, so each open mounts a fresh form (a new client gets its own UUID).
  const [creating, setCreating] = useState(0);

  const createModal =
    creating > 0 ? <ClientFormModal key={creating} client={null} onClose={() => setCreating(0)} /> : null;

  if (!wide) {
    return (
      <>
        <ClientsList onCreate={() => setCreating((n) => n + 1)} onSelect={(c) => router.push(`/clients/${c.id}`)} />
        {createModal}
      </>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: t.colors.bg }}>
      <View
        style={{
          width: LIST_PANE_WIDTH,
          borderEndWidth: t.borderWidth.hairline,
          borderEndColor: t.colors.border,
        }}
      >
        <ClientsList
          onCreate={() => setCreating((n) => n + 1)}
          onSelect={(c) => setSelected(c.id)}
          selectedId={selected}
        />
      </View>
      <View style={{ flex: 1 }}>
        {selected ? (
          // Keyed per client, so switching rows resets the tab and closes any open sheet.
          <ClientCard key={selected} id={selected} pane onGone={() => setSelected(null)} />
        ) : (
          <EmptyState
            card={false}
            title="בחרו לקוח מהרשימה"
            style={{ flex: 1, paddingTop: insets.top }}
          />
        )}
      </View>
      {createModal}
    </View>
  );
}
