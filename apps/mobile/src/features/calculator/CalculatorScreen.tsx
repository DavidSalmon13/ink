import * as Clipboard from 'expo-clipboard';
import { useMemo, useReducer, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Client } from '@/api/clients';
import type { Quote } from '@/api/quotes';
import type { Settings } from '@/api/settings';
import { useClient } from '@/features/clients';
import {
  ClientPickerSlot,
  QuoteSaveProvider,
  SaveActionSlot,
  fromQuote,
  useQuote,
  type QuoteEditContext,
} from '@/features/quotes';
import { calcQuote } from '@/pricing';
import { componentMetrics as cm, fontFace, Num, Text, useTheme } from '@/theme';
import { Button, ErrorState, Field, Icon, IconButton, LoadingState, SegmentedControl, useToast, type Segment } from '@/ui';

import { ItemEditor } from './ItemEditor';
import { Summary } from './Summary';
import { copyQuoteText } from './copyQuoteText';
import {
  calculatorReducer,
  initCalculatorState,
  toQuoteInput,
  type CalculatorState,
  type DiscountKind,
  type OptionsState,
} from './calculatorState';
import { useSettings } from './useSettings';

/**
 * iPad and up center the iPhone composition in the pane — there is no Calculator.ipad.html, so the
 * layout is the iPhone one capped and centered (recorded as a deviation in the spec Changelog).
 */
export const CALC_MAX_WIDTH = 440;
const WIDE_MIN_WIDTH = 768;

const DISCOUNT_KINDS: readonly Segment<DiscountKind>[] = [
  { value: 'percent', label: '%' },
  { value: 'amount', label: '₪' },
];

/** A `.field` label above a control that isn't a Field (the discount selector + value row). */
function Labeled({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.spacing.xs + 2 }}>
      <Text style={{ fontFamily: fontFace('600'), fontSize: cm.field.labelFontSize, color: t.colors.textMuted }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/** A bare `.input` box (no label) with a trailing unit, for the discount value beside its selector. */
function UnitInput({
  value,
  onChangeText,
  unit,
  accessibilityLabel,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  accessibilityLabel: string;
  style?: object;
}) {
  const t = useTheme();
  const c = t.colors;
  return (
    <View
      style={[
        {
          minHeight: t.touch.inputHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: cm.field.inputGap,
          paddingHorizontal: cm.field.inputPaddingHorizontal,
          backgroundColor: c.surface,
          borderRadius: t.radii.md,
          borderWidth: t.borderWidth.hairline,
          borderColor: c.borderStrong,
        },
        style,
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={c.textMuted}
        style={{
          flex: 1,
          minHeight: t.touch.inputHeight,
          fontFamily: fontFace('400'),
          fontSize: cm.field.inputFontSize,
          color: c.text,
          writingDirection: 'ltr',
        }}
      />
      <Text style={{ fontFamily: fontFace('400'), fontSize: cm.field.unitFontSize, color: c.textMuted }}>{unit}</Text>
    </View>
  );
}

/** The `.stepper` pill — minus / count / plus — for the extra-needles count. */
function Stepper({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: t.borderWidth.strong,
        borderColor: t.colors.borderStrong,
        borderRadius: t.radii.pill,
      }}
    >
      <IconButton icon="plus" accessibilityLabel="הוספה" onPress={() => onChange(value + 1)} />
      <Num variant="headline" color="text" style={{ width: 28, textAlign: 'center' }}>
        {value}
      </Num>
      <IconButton
        icon="minus"
        accessibilityLabel="הפחתה"
        disabled={value <= 0}
        onPress={() => onChange(Math.max(0, value - 1))}
      />
    </View>
  );
}

/** A collapsible section (`<details>`), open by default like the mockup's "אפשרויות נוספות". */
function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  const [open, setOpen] = useState(true);
  return (
    <View style={{ marginTop: t.spacing.lg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: t.spacing.rowHeight,
          borderTopWidth: t.borderWidth.hairline,
          borderBottomWidth: t.borderWidth.hairline,
          borderColor: t.colors.border,
        }}
      >
        <Text variant="headline">{title}</Text>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevron" size={20} color="text" />
        </View>
      </Pressable>
      {open ? <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.md }}>{children}</View> : null}
    </View>
  );
}

/** The "אפשרויות נוספות" body: extra-needles stepper, the %/₪ discount, and the manual price. */
function MoreOptions({
  settings,
  options,
  patchOptions,
}: {
  settings: Settings;
  options: OptionsState;
  patchOptions: (patch: Partial<OptionsState>) => void;
}) {
  const t = useTheme();
  const needleCost = Math.round(settings.extraNeedleCostAgorot / 100);

  return (
    <Collapsible title="אפשרויות נוספות">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.md }}>
        <View style={{ gap: t.spacing.xxs }}>
          <Text variant="body" style={{ fontFamily: fontFace('600') }}>
            תוספת מחטים
          </Text>
          <Text variant="callout" color="textMuted">
            {`${needleCost} ₪ למחט נוספת`}
          </Text>
        </View>
        <Stepper
          accessibilityLabel="תוספת מחטים"
          value={options.extraNeedles}
          onChange={(extraNeedles) => patchOptions({ extraNeedles })}
        />
      </View>

      <Labeled label="הנחה">
        <View style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'stretch' }}>
          <SegmentedControl
            accessibilityLabel="סוג הנחה"
            segments={DISCOUNT_KINDS}
            value={options.discountKind}
            onChange={(discountKind) => patchOptions({ discountKind })}
            style={{ width: 120 }}
          />
          <UnitInput
            accessibilityLabel="סכום הנחה"
            value={options.discountValue}
            onChangeText={(discountValue) => patchOptions({ discountValue })}
            unit={options.discountKind === 'percent' ? '%' : '₪'}
            style={{ flex: 1 }}
          />
        </View>
        <Text variant="callout" color="textMuted">
          ההנחה חלה על כל הביקור, כולל דמי העיצוב.
        </Text>
      </Labeled>

      <Field
        label="מחיר ידני"
        value={options.priceOverride}
        onChangeText={(priceOverride) => patchOptions({ priceOverride })}
        keyboardType="decimal-pad"
        ltr
        placeholder="ללא — לפי החישוב"
      />
    </Collapsible>
  );
}

interface CalculatorEditorProps {
  /** The reducer's starting state — a fresh calculator, or one seeded from a reopened quote (AC3). */
  initialState: CalculatorState;
  /** The pre-picked client when reopening a quote (AC3); null on the create path. */
  initialClient: Client | null;
  /** The edit context when reopening a quote (AC4); null on the create path. */
  editContext: QuoteEditContext | null;
}

/**
 * The Calculator tab body (Calculator.html). Loads the seeded Settings and shows the shared loading and
 * error states (an error offers retry); once loaded it prices the visit live from the item editors and
 * the "אפשרויות נוספות" options, and shows the summary breakdown. The reducer seeds from `initialState`, so a
 * reopened quote starts with its items and options (AC3); `initialClient`/`editContext` flow to the save slot.
 */
function CalculatorEditor({ initialState, initialClient, editContext }: CalculatorEditorProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const settings = useSettings();
  const toast = useToast();
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  let body: ReactNode = null;
  if (settings.data === undefined) {
    body = settings.isError ? (
      <ErrorState title="לא הצלחנו לטעון את המחירון" onRetry={() => void settings.refetch()} />
    ) : (
      <LoadingState />
    );
  } else {
    const data = settings.data;
    const quoteInput = toQuoteInput(state);
    const breakdown = calcQuote(quoteInput, data);
    const multiple = state.items.length > 1;

    const onCopy = async () => {
      await Clipboard.setStringAsync(copyQuoteText(quoteInput.items, breakdown));
      toast.show('ההצעה הועתקה');
    };
    body = (
      <View style={{ gap: t.spacing.lg }}>
        <View style={{ gap: t.spacing.md }}>
          {state.items.map((item, index) => (
            <ItemEditor
              key={item.id}
              item={item}
              settings={data}
              index={index}
              onChange={(patch) => dispatch({ type: 'patchItem', id: item.id, patch })}
              onRemove={multiple ? () => dispatch({ type: 'removeItem', id: item.id }) : undefined}
            />
          ))}
          <Button
            label="קעקוע נוסף"
            variant="secondary"
            block
            icon="plus"
            onPress={() => dispatch({ type: 'addItem' })}
          />
        </View>

        <MoreOptions
          settings={data}
          options={state.options}
          patchOptions={(patch) => dispatch({ type: 'patchOptions', patch })}
        />

        <Summary breakdown={breakdown} settings={data} />

        <SaveActionSlot state={state} onCopy={() => void onCopy()} />
      </View>
    );
  }

  return (
    <QuoteSaveProvider initialClient={initialClient} editContext={editContext}>
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
            <View style={{ paddingBottom: t.spacing.lg }}>
              <ClientPickerSlot />
            </View>
            {body}
          </View>
        </ScrollView>
      </View>
    </QuoteSaveProvider>
  );
}

/** A full-screen frame for the edit-mode load states (the editor itself draws its own chrome once ready). */
function EditLoadFrame({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingTop: insets.top + t.spacing.xs }}>
      {children}
    </View>
  );
}

/** Loads the reopened quote's client, then mounts the editor seeded + pre-picked (client-quotes AC3). */
function EditQuoteWithClient({ quote }: { quote: Quote }) {
  const client = useClient(quote.clientId);
  if (client.data === undefined) {
    return (
      <EditLoadFrame>
        {client.isError ? (
          <ErrorState title="לא הצלחנו לטעון את הלקוח" onRetry={() => void client.refetch()} />
        ) : (
          <LoadingState />
        )}
      </EditLoadFrame>
    );
  }
  return (
    <CalculatorEditor
      initialState={fromQuote(quote)}
      initialClient={client.data}
      editContext={{
        id: quote.id,
        version: quote.version,
        title: quote.title,
        notes: quote.notes ?? '',
      }}
    />
  );
}

/** Loads a reopened quote by id, showing the shared loading / error(retry) states until it arrives (AC3). */
function EditQuoteGate({ quoteId }: { quoteId: string }) {
  const quote = useQuote(quoteId);
  if (quote.data === undefined) {
    return (
      <EditLoadFrame>
        {quote.isError ? (
          <ErrorState title="לא הצלחנו לטעון את ההצעה" onRetry={() => void quote.refetch()} />
        ) : (
          <LoadingState />
        )}
      </EditLoadFrame>
    );
  }
  return <EditQuoteWithClient quote={quote.data} />;
}

/**
 * The Calculator tab (Calculator.html). Without a `quoteId` it is a fresh calculator (the create path); with
 * one it reopens that saved quote — fetching it and its client, then seeding the editor and pre-picking the
 * client so the summary reproduces the saved totals and a save updates it in place (client-quotes AC3/AC4).
 */
export function CalculatorScreen({ quoteId }: { quoteId?: string }) {
  const createState = useMemo(() => initCalculatorState(), []);
  if (quoteId) return <EditQuoteGate quoteId={quoteId} />;
  return <CalculatorEditor initialState={createState} initialClient={null} editContext={null} />;
}
