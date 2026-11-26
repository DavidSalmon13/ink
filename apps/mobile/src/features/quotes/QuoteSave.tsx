import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import type { Client } from '@/api/clients';
import type { CalculatorState } from '@/features/calculator';
import { Text, useTheme } from '@/theme';
import { Button } from '@/ui';

import { ClientPicker } from './ClientPicker';
import { SaveQuoteSheet } from './SaveQuoteSheet';

/**
 * Marks the Calculator as editing an existing quote (client-quotes AC4). Carried from the reopened quote by
 * CalculatorScreen and read by the save sheet, which then reuses the quote's `id`, sends its `version` and
 * prefills the saved `title`/`notes` instead of minting a fresh quote. `null` is the create path.
 */
export interface QuoteEditContext {
  id: string;
  version: number;
  title: string;
  notes: string;
}

interface QuoteSaveContextValue {
  client: Client | null;
  setClient: (client: Client | null) => void;
  editContext: QuoteEditContext | null;
}

const QuoteSaveContext = createContext<QuoteSaveContextValue | null>(null);

export function useQuoteSave(): QuoteSaveContextValue {
  const value = useContext(QuoteSaveContext);
  if (value === null) throw new Error('QuoteSave slots must be used inside <QuoteSaveProvider>');
  return value;
}

export interface QuoteSaveProviderProps {
  children: ReactNode;
  /** Pre-picked client when reopening a quote to edit (client-quotes AC3); null/omitted is the create path. */
  initialClient?: Client | null;
  /** Edit context when reopening a quote (client-quotes AC4); null/omitted is the create path. */
  editContext?: QuoteEditContext | null;
}

/**
 * Shares the picked client between the two Calculator slots — the {@link ClientPickerSlot} at the top and the
 * {@link SaveActionSlot} beside "העתקת הצעה" — so the save button knows whether a client is chosen. Holds no
 * UI of its own; CalculatorScreen wraps its content in it. When reopening a quote (client-quotes AC3/AC4) it
 * seeds the picked client and carries the edit context the save sheet reads.
 */
export function QuoteSaveProvider({
  children,
  initialClient = null,
  editContext = null,
}: QuoteSaveProviderProps) {
  const [client, setClient] = useState<Client | null>(initialClient);
  const value = useMemo(() => ({ client, setClient, editContext }), [client, editContext]);
  return <QuoteSaveContext.Provider value={value}>{children}</QuoteSaveContext.Provider>;
}

/** The client block at the top of the calculator (AC6), bound to the shared pick. */
export function ClientPickerSlot() {
  const { client, setClient } = useQuoteSave();
  return <ClientPicker value={client} onChange={setClient} />;
}

export interface SaveActionSlotProps {
  state: CalculatorState;
  /** Copies the current quote (the calculator owns the clipboard logic; unchanged from calculator-preview). */
  onCopy: () => void;
}

/**
 * The bottom action block of Calculator.html (AC6): "העתקת הצעה" beside "שמירת הצעה", then the "saving does not
 * create an appointment" helper. Copy works with no client; save is disabled until one is picked and opens the
 * save sheet. The mockup's trailing "אחרי השמירה: ״קביעת תור״" is dropped — that button is deferred to the
 * Calendar epic (recorded in the spec Changelog), so only the accurate first sentence is shown.
 */
export function SaveActionSlot({ state, onCopy }: SaveActionSlotProps) {
  const t = useTheme();
  const { client, editContext } = useQuoteSave();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
        <Button
          label="העתקת הצעה"
          variant="secondary"
          icon="copy"
          onPress={onCopy}
          style={{ flex: 1 }}
        />
        <Button
          label="שמירת הצעה"
          disabled={client === null}
          onPress={() => setSheetOpen(true)}
          style={{ flex: 1.3 }}
        />
      </View>
      <Text variant="callout" color="textMuted" style={{ textAlign: 'center' }}>
        שמירת הצעה אינה יוצרת תור.
      </Text>
      {sheetOpen && client ? (
        <SaveQuoteSheet
          state={state}
          client={client}
          editContext={editContext}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </View>
  );
}
