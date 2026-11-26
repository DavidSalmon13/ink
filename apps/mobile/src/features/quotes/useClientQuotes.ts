import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteQuote, listQuotes, type Quote } from '@/api/quotes';
import { useApiClient } from '@/auth/AuthProvider';

import { quoteListKey } from './useSaveQuote';

/**
 * A client's saved quotes for the card's Quotes tab (client-quotes AC1), newest-first as the API returns
 * them, under the same `quoteListKey(clientId)` the save flow invalidates — so saving a new quote refreshes
 * this list automatically.
 */
export function useClientQuotes(clientId: string) {
  const api = useApiClient();
  return useQuery<Quote[]>({
    queryKey: quoteListKey(clientId),
    queryFn: () => listQuotes(api, clientId),
  });
}

export interface DeleteQuoteVars {
  /** The quote to soft-delete. */
  id: string;
  /** The owning client, so the right list is invalidated on success. */
  clientId: string;
}

/**
 * Soft-deletes a quote (client-quotes AC2) and invalidates that client's list so the row leaves it. Delete is
 * idempotent server-side, so a retry is safe.
 */
export function useDeleteQuote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteQuoteVars) => deleteQuote(api, id),
    onSuccess: async (_result, { clientId }) => {
      await queryClient.invalidateQueries({ queryKey: quoteListKey(clientId) });
    },
  });
}
