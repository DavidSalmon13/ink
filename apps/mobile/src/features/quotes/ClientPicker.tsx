import { Fragment, useEffect, useState } from 'react';
import { View } from 'react-native';

import type { Client } from '@/api/clients';
import { ClientFormModal, useClients } from '@/features/clients';
import { Text, useTheme } from '@/theme';
import { Avatar, Button, EmptyState, IconButton, Row, Search } from '@/ui';

/** Server search runs this long after typing stops, matching the Clients list. */
const SEARCH_DEBOUNCE_MS = 250;
/** Result-row metrics, mirroring the Clients list pane (ClientCard.ipad.html). */
const rowMetrics = { minHeight: 56, avatarSize: 40, avatarFontSize: 15, subtitleFontSize: 13 } as const;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** The secondary line that helps tell results apart: phone, else Instagram, else nothing. */
function subtitleOf(client: Client): string | null {
  if (client.phone) return client.phone;
  if (client.instagram) return `@${client.instagram}`;
  return null;
}

export interface ClientPickerProps {
  /** The chosen client, or null when none is picked yet. */
  value: Client | null;
  onChange: (client: Client | null) => void;
}

/**
 * The client block at the top of Calculator.html (AC6): a "לקוחות" header with "לקוח חדש", a server-side
 * search reusing {@link useClients}, the matching rows, a picked-client pill and the "save without a client"
 * helper. Typing shows results; tapping one picks it and clears the search; "לקוח חדש" opens
 * {@link ClientFormModal} and picks the new client on save; the pill's ✕ clears the pick.
 */
export function ClientPicker({ value, onChange }: ClientPickerProps) {
  const t = useTheme();
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useDebounced(text.trim(), SEARCH_DEBOUNCE_MS);
  const clients = useClients(q);

  const pick = (client: Client) => {
    onChange(client);
    setText('');
  };

  const showResults = q.length > 0;

  return (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="title2" accessibilityRole="header">
          לקוחות
        </Text>
        <Button small variant="ghost" icon="plus" label="לקוח חדש" onPress={() => setCreating(true)} />
      </View>

      <Search
        accessibilityLabel="חיפוש לקוח"
        placeholder="חיפוש לפי שם, טלפון או אינסטגרם"
        value={text}
        onChangeText={setText}
      />

      {showResults ? (
        <View style={{ borderRadius: t.radii.md, overflow: 'hidden', backgroundColor: t.colors.surface }}>
          {clients.data === undefined ? null : clients.data.length === 0 ? (
            <View style={{ paddingVertical: t.spacing.md }}>
              <EmptyState title={`לא נמצאו לקוחות עבור ״${q}״`} art={false} />
            </View>
          ) : (
            clients.data.map((client, index) => {
              const subtitle = subtitleOf(client);
              return (
                <Fragment key={client.id}>
                  {index > 0 ? (
                    <View style={{ height: t.borderWidth.hairline, backgroundColor: t.colors.border }} />
                  ) : null}
                  <Row
                    onPress={() => pick(client)}
                    accessibilityLabel={client.name}
                    style={{ minHeight: rowMetrics.minHeight, paddingHorizontal: t.spacing.md }}
                  >
                    <Avatar name={client.name} size={rowMetrics.avatarSize} fontSize={rowMetrics.avatarFontSize} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {/* rtl base direction so a Latin name sits next to its avatar, not across the row. */}
                      <Text variant="headline" numberOfLines={1} style={{ writingDirection: 'rtl' }}>
                        {client.name}
                      </Text>
                      {subtitle ? (
                        <Text
                          variant="callout"
                          color="textMuted"
                          numberOfLines={1}
                          style={{ fontSize: rowMetrics.subtitleFontSize, writingDirection: 'ltr' }}
                        >
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </Row>
                </Fragment>
              );
            })
          )}
        </View>
      ) : null}

      {value ? (
        <View
          accessibilityLabel={`לקוח נבחר: ${value.name}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}
        >
          <Avatar name={value.name} size={36} fontSize={14} />
          <Text variant="headline" numberOfLines={1} style={{ flex: 1, writingDirection: 'rtl' }}>
            {value.name}
          </Text>
          <IconButton icon="close" accessibilityLabel="הסרת לקוח" onPress={() => onChange(null)} />
        </View>
      ) : null}

      <Text variant="callout" color="textMuted">
        אפשר לחשב ולהעתיק הצעת מחיר גם בלי לבחור לקוח.
      </Text>

      {creating ? (
        <ClientFormModal
          client={null}
          onClose={() => setCreating(false)}
          onSaved={(client) => {
            setCreating(false);
            pick(client);
          }}
        />
      ) : null}
    </View>
  );
}
