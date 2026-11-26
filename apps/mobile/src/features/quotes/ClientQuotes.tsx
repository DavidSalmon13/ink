import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Quote } from '@/api/quotes';
import { Text, useTheme } from '@/theme';
import { Button, EmptyState, ErrorState, LoadingState, Modal } from '@/ui';

import { QuoteRow } from './QuoteRow';
import { useClientQuotes, useDeleteQuote } from './useClientQuotes';

export interface ClientQuotesProps {
  clientId: string;
}

/**
 * The client card's "הצעות מחיר" tab (client-quotes AC1): the client's saved quotes newest-first, with the
 * shared loading / error(retry) / empty states, and delete-with-confirm (AC2). Tapping a row reopens that quote
 * in the Calculator to edit it (AC3). No mockup exists for this list, so it is built from `src/ui` components
 * and theme tokens only (recorded deviation).
 */
export function ClientQuotes({ clientId }: ClientQuotesProps) {
  const t = useTheme();
  const router = useRouter();
  const quotes = useClientQuotes(clientId);
  const remove = useDeleteQuote();
  const [pending, setPending] = useState<Quote | null>(null);

  const reopen = (quote: Quote) =>
    router.push({ pathname: '/(tabs)/calculator', params: { quoteId: quote.id } });

  const confirmDelete = async () => {
    if (!pending) return;
    try {
      await remove.mutateAsync({ id: pending.id, clientId });
      setPending(null);
    } catch {
      // Delete failed; keep the dialog open so Aya can retry.
    }
  };

  if (quotes.data === undefined) {
    return quotes.isError ? (
      <ErrorState title="לא הצלחנו לטעון את ההצעות" onRetry={() => void quotes.refetch()} />
    ) : (
      <LoadingState />
    );
  }

  if (quotes.data.length === 0) {
    return <EmptyState title="עדיין אין הצעות מחיר" />;
  }

  return (
    <View style={{ gap: t.spacing.sm }}>
      {quotes.data.map((quote) => (
        <QuoteRow key={quote.id} quote={quote} onReopen={reopen} onDelete={setPending} />
      ))}
      {pending ? (
        <Modal
          visible
          title="מחיקת הצעה"
          onClose={() => setPending(null)}
          footer={[
            <Button key="cancel" variant="secondary" block label="ביטול" onPress={() => setPending(null)} />,
            <Button
              key="delete"
              variant="destructive"
              block
              label="מחיקה"
              loading={remove.isPending}
              onPress={() => void confirmDelete()}
            />,
          ]}
        >
          <Text>{`ההצעה "${pending.title}" תוסר מהרשימה.`}</Text>
        </Modal>
      ) : null}
    </View>
  );
}
