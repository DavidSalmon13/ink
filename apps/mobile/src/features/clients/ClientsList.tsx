import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Client } from '@/api/clients';
import { Text, useTheme } from '@/theme';
import { Avatar, Button, EmptyState, ErrorState, LoadingState, Row, Search } from '@/ui';

import { useClients } from './useClients';

/** Server search runs this long after typing stops (AC5). */
export const SEARCH_DEBOUNCE_MS = 250;

/**
 * ClientCard.ipad.html list-pane metrics that tokens.json doesn't carry: `.list .row` is 60px tall with
 * 8px × 20px padding, and its avatar is 40px with a 15px initial; the subtitle is 13px muted.
 */
const listMetrics = { rowMinHeight: 60, avatarSize: 40, avatarFontSize: 15, subtitleFontSize: 13 } as const;
/** iPad widths and up use the mockup's 20px pane inset; iPhone keeps the 16px screen padding. */
const WIDE_MIN_WIDTH = 768;

/** "N קעקועים" / "קעקוע אחד" / "אין עדיין קעקועים" (AC4). */
export function tattooCountLabel(count: number): string {
  if (count <= 0) return 'אין עדיין קעקועים';
  if (count === 1) return 'קעקוע אחד';
  return `${count} קעקועים`;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface ClientsListProps {
  /** "לקוח חדש" (header button and the empty state's action). */
  onCreate: () => void;
  /** A row was tapped. */
  onSelect: (client: Client) => void;
}

/**
 * The Clients list (ClientCard.ipad.html list pane; full width on iPhone, and on iPad until client-card
 * adds the split view): title + "לקוח חדש", server-side search, rows, the AC6 states, pull-to-refresh,
 * and a refetch whenever the tab regains focus (AC8).
 */
export function ClientsList({ onCreate, onSelect }: ClientsListProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inset = width >= WIDE_MIN_WIDTH ? t.spacing.xl : t.spacing.screenPadding;

  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), SEARCH_DEBOUNCE_MS);
  const clients = useClients(q);
  const { refetch } = clients;

  // The first focus is the mount, which already fetches; later focuses pick up other-device changes.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) void refetch();
      focusedOnce.current = true;
    }, [refetch]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const newClientButton = <Button small icon="plus" label="לקוח חדש" onPress={onCreate} />;

  let state = null;
  if (clients.data === undefined) {
    state = clients.isError ? (
      <ErrorState title="לא הצלחנו לטעון את הלקוחות" onRetry={() => void refetch()} />
    ) : (
      <LoadingState />
    );
  } else if (clients.data.length === 0) {
    state = q ? (
      <EmptyState title={`לא נמצאו לקוחות עבור ״${q}״`} art={false} />
    ) : (
      <EmptyState title="עדיין אין לקוחות" action={newClientButton} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface, paddingTop: insets.top + t.spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: t.spacing.sm,
          paddingBottom: t.spacing.md,
          paddingHorizontal: inset,
        }}
      >
        <Text variant="title1" accessibilityRole="header">
          לקוחות
        </Text>
        {newClientButton}
      </View>
      <Search
        accessibilityLabel="חיפוש לקוח"
        placeholder="חיפוש לפי שם, טלפון או אינסטגרם"
        value={text}
        onChangeText={setText}
        style={{ marginHorizontal: inset, marginBottom: t.spacing.md }}
      />
      {state ? (
        <View style={{ paddingHorizontal: inset }}>{state}</View>
      ) : (
        // A plain ScrollView: a solo studio's list is at most a few hundred rows, and no pagination (Out of Scope).
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        >
          {clients.data?.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 ? <View style={{ height: t.borderWidth.hairline, backgroundColor: t.colors.border }} /> : null}
              <Row
                onPress={() => onSelect(item)}
                accessibilityLabel={`${item.name}, ${tattooCountLabel(item.tattooCount)}`}
                style={{ minHeight: listMetrics.rowMinHeight, paddingHorizontal: inset }}
              >
                <Avatar name={item.name} size={listMetrics.avatarSize} fontSize={listMetrics.avatarFontSize} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="headline" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="callout" color="textMuted" style={{ fontSize: listMetrics.subtitleFontSize }}>
                    {tattooCountLabel(item.tattooCount)}
                  </Text>
                </View>
              </Row>
            </Fragment>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
