import * as Crypto from 'expo-crypto';
import { useState } from 'react';

import type { Client } from '@/api/clients';
import type { CalculatorState } from '@/features/calculator';
import { Button, Field, Modal } from '@/ui';

import type { QuoteEditContext } from './QuoteSave';
import { buildQuoteInput, defaultQuoteTitle } from './quoteInput';
import { useSaveQuote } from './useSaveQuote';

export interface SaveQuoteSheetProps {
  state: CalculatorState;
  client: Client;
  /** Set when editing a reopened quote (client-quotes AC4); null on the create path. */
  editContext: QuoteEditContext | null;
  onClose: () => void;
}

/**
 * The save sheet (AC6): a title pre-filled from the item descriptions (editable) and an optional notes field.
 * "שמירה" builds the quote from the calculator state and PUTs it under the chosen client; the server recomputes
 * every price. No mockup for the sheet itself, so it follows ClientFormModal's Modal + Field pattern. Mounted
 * fresh per open (the slot unmounts it on close), so the ids are fixed once and a retry reuses them.
 *
 * Creating (`editContext` null): one device UUID for the quote and each item is minted, the title defaults to
 * the item descriptions and notes start empty. Editing a reopened quote (client-quotes AC4): the quote's own
 * id and its item ids are reused and its `version` sent, so the PUT updates in place (a stale version surfaces
 * the conflict toast), with the saved title/notes prefilled and editable. Save is disabled while the title is
 * blank.
 */
export function SaveQuoteSheet({ state, client, editContext, onClose }: SaveQuoteSheetProps) {
  const [quoteId] = useState(() => editContext?.id ?? Crypto.randomUUID());
  const [itemIds] = useState(() =>
    editContext ? state.items.map((item) => item.id) : state.items.map(() => Crypto.randomUUID()),
  );
  const [title, setTitle] = useState(() => editContext?.title ?? defaultQuoteTitle(state));
  const [notes, setNotes] = useState(() => editContext?.notes ?? '');
  const save = useSaveQuote();

  const onSave = async () => {
    const input = buildQuoteInput(state, {
      clientId: client.id,
      title,
      notes,
      itemIds,
      version: editContext?.version,
    });
    try {
      await save.mutateAsync({ id: quoteId, input });
      onClose();
    } catch {
      // The hook already showed the conflict / offline / failed toast; the sheet stays open to retry.
    }
  };

  return (
    <Modal
      visible
      title="שמירת הצעה"
      onClose={onClose}
      footer={[
        <Button key="cancel" variant="secondary" block label="ביטול" onPress={onClose} />,
        <Button
          key="save"
          block
          label="שמירה"
          loading={save.isPending}
          disabled={!title.trim()}
          onPress={() => void onSave()}
        />,
      ]}
    >
      <Field label="כותרת" value={title} onChangeText={setTitle} maxLength={200} />
      <Field label="הערות" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
    </Modal>
  );
}
