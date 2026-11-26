import * as Crypto from 'expo-crypto';
import { useState } from 'react';

import type { Client } from '@/api/clients';
import type { CalculatorState } from '@/features/calculator';
import { Button, Field, Modal } from '@/ui';

import { buildQuoteInput, defaultQuoteTitle } from './quoteInput';
import { useSaveQuote } from './useSaveQuote';

export interface SaveQuoteSheetProps {
  state: CalculatorState;
  client: Client;
  onClose: () => void;
}

/**
 * The save sheet (AC6): a title pre-filled from the item descriptions (editable) and an optional notes field.
 * "שמירה" builds the quote from the calculator state and PUTs it under the chosen client; the server recomputes
 * every price. No mockup for the sheet itself, so it follows ClientFormModal's Modal + Field pattern. Mounted
 * fresh per open (the slot unmounts it on close), so one device UUID — for the quote and each item — is minted
 * once and a retry reuses it (AC3). Save is disabled while the title is blank.
 */
export function SaveQuoteSheet({ state, client, onClose }: SaveQuoteSheetProps) {
  const [quoteId] = useState(() => Crypto.randomUUID());
  const [itemIds] = useState(() => state.items.map(() => Crypto.randomUUID()));
  const [title, setTitle] = useState(() => defaultQuoteTitle(state));
  const [notes, setNotes] = useState('');
  const save = useSaveQuote();

  const onSave = async () => {
    const input = buildQuoteInput(state, { clientId: client.id, title, notes, itemIds });
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
