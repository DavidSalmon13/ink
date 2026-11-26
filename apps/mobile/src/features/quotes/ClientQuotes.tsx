import { View } from 'react-native';

import type { Quote } from '@/api/quotes';
import { useTheme } from '@/theme';
import { EmptyState, ErrorState, LoadingState } from '@/ui';

import { QuoteRow } from './QuoteRow';
import { useClientQuotes } from './useClientQuotes';

export interface ClientQuotesProps {
  clientId: string;
  /** Reopen a quote in the Calculator (wired to navigation in T10). */
  onReopen?: (quote: Quote) => void;
}

/**
 * The client card's "הצעות מחיר" tab (client-quotes AC1): the client's saved quotes newest-first, with the
 * shared loading / error(retry) / empty states. No mockup exists for this list, so it is built from `src/ui`
 * components and theme tokens only (recorded deviation). Delete-with-confirm is added in T5.
 */
export function ClientQuotes({ clientId, onReopen }: ClientQuotesProps) {
  const t = useTheme();
  const quotes = useClientQuotes(clientId);

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
        <QuoteRow key={quote.id} quote={quote} onReopen={onReopen} />
      ))}
    </View>
  );
}
