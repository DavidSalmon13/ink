import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Client, ClientSummary } from '@/api/clients';
import { componentMetrics as m, fontFace, Num, Text, useTheme } from '@/theme';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  formatMonthYear,
  Icon,
  IconButton,
  LoadingState,
  Skeleton,
  Tabs,
  type IconName,
} from '@/ui';
import { ClientQuotes } from '@/features/quotes';

import { ClientFormModal } from '../ClientFormModal';
import { clientsKey } from '../useClients';
import { ConsentRow } from './ConsentRow';
import { ContactSheet, instagramUrl, useOpenLink } from './ContactSheet';
import { DeleteClientDialog, MoreActionsSheet } from './DeleteClientDialog';
import { isNotFound, useClient, useClientSummary, useDeleteClient } from './useClientCard';

/**
 * ClientCard.html / ClientCard.ipad.html metrics that tokens.json doesn't carry: the 64px avatar with a
 * 24px initial and 14px gap beside the name; the 14px muted "since" and next-appointment lines; chips
 * 14px below the header with 18px glyphs; stats 16px below with 10px gaps and 12×14 tile padding;
 * the next-appointment line 10px below the stats; tabs 18px below; the tab body 14px below the tabs.
 * The iPad pane's actions row sits 6px above the header.
 */
const cardMetrics = {
  avatarSize: 64,
  avatarFontSize: 24,
  headerGap: 14,
  subFontSize: 14,
  chipsMarginTop: 14,
  chipIconSize: 18,
  statsMarginTop: 16,
  statsGap: 10,
  statPaddingVertical: 12,
  statPaddingHorizontal: 14,
  /** `.label` is 13px at `line-height: normal`, which is 19px in Heebo (the wrapped income label). */
  statLabelLineHeight: 19,
  nextMarginTop: 10,
  tabsMarginTop: 18,
  bodyMarginTop: 14,
  paneActionsMarginBottom: 6,
  statSkeletonWidth: 48,
} as const;

const NO_NEXT_APPOINTMENT = 'אין תור קרוב';

type TabValue = 'tattoos' | 'quotes' | 'notes';

/** "קעקועים · 3", or just "קעקועים" while there are none (AC5). */
const withCount = (label: string, count: number) => (count > 0 ? `${label} · ${count}` : label);

export interface ClientCardProps {
  id: string;
  /** The client is gone (deleted here or elsewhere): leave the card (iPhone) or clear the pane (iPad). */
  onGone: () => void;
  /** Rendered as the iPad split's side pane (ClientCard.ipad.html) rather than a full iPhone screen. */
  pane?: boolean;
  /** iPhone: the "לקוחות" back link in the top bar. */
  onBack?: () => void;
}

/**
 * The client card (AC2, AC4, AC5): header with contact chips, the summary tiles, the marketing-consent
 * row (marketing-consent AC5), and the קעקועים / הצעות מחיר / הערות tabs. Shared by the iPhone route and the iPad pane.
 */
export function ClientCard({ id, onGone, pane = false, onBack }: ClientCardProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const client = useClient(id);
  const summary = useClientSummary(id);
  const [tab, setTab] = useState<TabValue>('tattoos');
  const [sheet, setSheet] = useState<'contact' | 'more' | 'confirm' | null>(null);
  const del = useDeleteClient();
  const queryClient = useQueryClient();
  // 0 = closed; bumped per open so each edit mounts a fresh, prefilled form (AC6).
  const [editKey, setEditKey] = useState(0);
  const openLink = useOpenLink();

  // Leave once: a delete here and the 404 that may follow it must not navigate twice.
  const left = useRef(false);
  const leave = useCallback(() => {
    if (left.current) return;
    left.current = true;
    onGone();
  }, [onGone]);

  const confirmDelete = () =>
    del.mutate(id, {
      onSuccess: leave,
      // Offline or a server error: the hook shows the toast, and the card stays (nothing is queued).
      onSettled: () => setSheet(null),
    });

  // A 404 can arrive on a refetch while the last data is still cached, so it wins over `data` (AC8).
  const notFound = isNotFound(client.error);
  useEffect(() => {
    if (!notFound) return;
    void queryClient.invalidateQueries({ queryKey: [...clientsKey, 'list'] });
    if (pane) leave();
  }, [notFound, pane, leave, queryClient]);

  const inset = pane ? t.spacing.xxxl : t.spacing.screenPadding;
  const frame = (children: ReactNode) => (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top + (pane ? t.spacing.sm : 0) }}>
      {children}
    </View>
  );

  // No edit or delete for a client that no longer exists (AC8).
  const actions = notFound ? null : (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton
        icon="edit"
        accessibilityLabel="עריכת פרטים"
        disabled={!client.data}
        onPress={() => setEditKey((n) => n + 1)}
      />
      <IconButton icon="more" accessibilityLabel="עוד פעולות" onPress={() => setSheet('more')} />
    </View>
  );

  const topBar = pane ? (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: inset,
        marginBottom: cardMetrics.paneActionsMarginBottom,
      }}
    >
      {actions}
    </View>
  ) : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.spacing.sm,
        minHeight: m.home.headerMinHeight,
        paddingTop: t.spacing.xs,
        paddingBottom: t.spacing.md,
        paddingHorizontal: inset,
      }}
    >
      <Pressable accessibilityRole="link" accessibilityLabel="חזרה ללקוחות" onPress={onBack} disabled={!onBack}>
        <Text variant="headline" color="textMuted">
          לקוחות
        </Text>
      </Pressable>
      {actions}
    </View>
  );

  if (notFound) {
    // The pane clears itself (effect above); the iPhone screen says so and offers the way back.
    // topBar carries its own inset, so it sits outside the padded body (same edge as the card's header).
    return frame(
      <>
        {topBar}
        {pane ? null : (
          <View style={{ paddingHorizontal: inset }}>
            <EmptyState
              title="הלקוח לא נמצא"
              art={false}
              action={<Button small variant="secondary" label="חזרה לרשימה" onPress={leave} />}
            />
          </View>
        )}
      </>,
    );
  }

  if (client.data === undefined) {
    return frame(
      <View style={{ paddingHorizontal: inset }}>
        {client.isError ? (
          <ErrorState title="לא הצלחנו לטעון את הלקוח" onRetry={() => void client.refetch()} />
        ) : (
          <LoadingState />
        )}
      </View>,
    );
  }

  const c = client.data;
  const tattooCount = summary.data?.tattooCount ?? 0;

  return frame(
    <ScrollView contentContainerStyle={{ paddingBottom: t.spacing.xxxl }}>
      {topBar}
      <Header
        client={c}
        inset={inset}
        onPhone={() => setSheet('contact')}
        onInstagram={(handle) => void openLink(instagramUrl(handle))}
      />
      <Stats summary={summary.data} pane={pane} inset={inset} />
      <ConsentRow client={c} inset={inset} pane={pane} />
      <Tabs<TabValue>
        accessibilityLabel="לשוניות כרטיס לקוח"
        tabs={[
          { value: 'tattoos', label: withCount('קעקועים', tattooCount) },
          { value: 'quotes', label: 'הצעות מחיר' },
          { value: 'notes', label: 'הערות' },
        ]}
        value={tab}
        onChange={setTab}
        style={{ marginTop: cardMetrics.tabsMarginTop, paddingHorizontal: pane ? 0 : inset, marginHorizontal: pane ? inset : 0 }}
      />
      <View style={{ paddingHorizontal: inset, marginTop: cardMetrics.bodyMarginTop }}>
        {tab === 'tattoos' ? <EmptyState title="עדיין אין קעקועים" /> : null}
        {tab === 'quotes' ? <ClientQuotes clientId={c.id} /> : null}
        {tab === 'notes' ? (
          c.notes ? (
            <Text style={{ writingDirection: 'rtl' }}>{c.notes}</Text>
          ) : (
            <EmptyState title="אין הערות" art={false} />
          )
        ) : null}
      </View>
      {editKey > 0 ? <ClientFormModal key={editKey} client={c} onClose={() => setEditKey(0)} /> : null}
      {sheet === 'contact' && c.phone ? <ContactSheet phone={c.phone} onClose={() => setSheet(null)} /> : null}
      {sheet === 'more' ? <MoreActionsSheet onDelete={() => setSheet('confirm')} onClose={() => setSheet(null)} /> : null}
      {sheet === 'confirm' ? (
        <DeleteClientDialog
          name={c.name}
          deleting={del.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setSheet(null)}
        />
      ) : null}
    </ScrollView>,
  );
}

/** Avatar, name, "לקוח/ה מאז <month year>" and the phone / Instagram chips (AC2). */
function Header({
  client,
  inset,
  onPhone,
  onInstagram,
}: {
  client: Client;
  inset: number;
  onPhone: () => void;
  onInstagram: (handle: string) => void;
}) {
  const t = useTheme();
  const handle = client.instagram?.replace(/^@/, '') || null;
  return (
    <View style={{ paddingHorizontal: inset }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: cardMetrics.headerGap }}>
        <Avatar name={client.name} size={cardMetrics.avatarSize} fontSize={cardMetrics.avatarFontSize} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="title1" accessibilityRole="header" style={{ writingDirection: 'rtl' }}>
            {client.name}
          </Text>
          <Text color="textMuted" style={{ fontSize: cardMetrics.subFontSize }}>
            {`לקוח/ה מאז ${formatMonthYear(client.createdAt)}`}
          </Text>
        </View>
      </View>
      {client.phone || handle ? (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginTop: cardMetrics.chipsMarginTop }}
        >
          {client.phone ? <ContactChip icon="phone" value={client.phone} onPress={onPhone} /> : null}
          {handle ? <ContactChip icon="instagram" value={`@${handle}`} onPress={() => onInstagram(handle)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export interface ContactChipProps {
  icon: IconName;
  /** Shown as an isolated LTR run (a phone number or an @handle). */
  value: string;
  onPress?: () => void;
}

/** ClientCard.html `.contact .chip`: the design-system `.chip` look as a link-style button with a glyph. */
function ContactChip({ icon, value, onPress }: ContactChipProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: m.chip.minHeight,
        paddingHorizontal: m.chip.paddingHorizontal,
        flexDirection: 'row',
        alignItems: 'center',
        gap: m.chip.gap,
        borderRadius: t.radii.sm,
        borderWidth: t.borderWidth.hairline,
        borderColor: t.colors.borderStrong,
        opacity: pressed ? m.pressedOpacity : 1,
      })}
    >
      <Icon name={icon} size={cardMetrics.chipIconSize} />
      <Num style={{ fontFamily: fontFace('400'), fontSize: m.chip.fontSize }}>{value}</Num>
    </Pressable>
  );
}

/**
 * "קעקועים שבוצעו" and "הכנסות לפי תורים שהסתיימו" tiles (AC4), plus the next appointment: a muted line
 * on iPhone, a third tile on iPad. `nextAppointmentAt` is always null until the Calendar epic, which
 * adds its formatting here.
 */
function Stats({ summary, pane, inset }: { summary: ClientSummary | undefined; pane: boolean; inset: number }) {
  const t = useTheme();
  const value = (content: ReactNode) =>
    summary ? content : <Skeleton width={cardMetrics.statSkeletonWidth} height={t.text.title1.lineHeight} />;

  return (
    <View style={{ paddingHorizontal: inset, marginTop: cardMetrics.statsMarginTop }}>
      <View style={{ flexDirection: 'row', gap: cardMetrics.statsGap }}>
        <Stat label="קעקועים שבוצעו">{value(<Num variant="title1">{summary?.tattooCount ?? 0}</Num>)}</Stat>
        <Stat label="הכנסות לפי תורים שהסתיימו">
          {value(<Num variant="title1" agorot={summary?.completedIncomeAgorot ?? 0} />)}
        </Stat>
        {pane ? (
          <Stat label="תור קרוב">{value(<Text variant="headline">{NO_NEXT_APPOINTMENT}</Text>)}</Stat>
        ) : null}
      </View>
      {pane ? null : (
        <Text color="textMuted" style={{ fontSize: cardMetrics.subFontSize, marginTop: cardMetrics.nextMarginTop }}>
          {NO_NEXT_APPOINTMENT}
        </Text>
      )}
    </View>
  );
}

/** ClientCard.html `.card.stat`: a `.label` over a title-size value. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <Card
      style={{
        flex: 1,
        minWidth: 0,
        paddingVertical: cardMetrics.statPaddingVertical,
        paddingHorizontal: cardMetrics.statPaddingHorizontal,
        gap: t.spacing.xs,
      }}
    >
      <Text
        style={{
          fontFamily: fontFace('600'),
          fontSize: m.field.labelFontSize,
          lineHeight: cardMetrics.statLabelLineHeight,
        }}
        color="textMuted"
      >
        {label}
      </Text>
      {children}
    </Card>
  );
}
