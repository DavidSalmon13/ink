import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError, NetworkError } from '@/api/client';
import { putQuote, type Quote, type QuoteInput } from '@/api/quotes';
import { useApiClient } from '@/auth/AuthProvider';
import { useToast } from '@/ui';

/** Every quote query (lists and single records) lives under this key; the list is keyed by client. */
export const quotesKey = ['quotes'] as const;
export const quoteListKey = (clientId: string) => [...quotesKey, 'list', clientId] as const;
/** A single quote's cache key (reopen reads it); defined here with the other keys so the save can refresh it. */
export const quoteDetailKey = (id: string) => [...quotesKey, 'detail', id] as const;

export const SAVED_MESSAGE = 'ההצעה נשמרה';
export const CONFLICT_MESSAGE = 'ההצעה עודכנה במכשיר אחר. נסו שוב.';
export const OFFLINE_SAVE_MESSAGE = 'אין חיבור לאינטרנט. ההצעה לא נשמרה.';
export const SAVE_FAILED_MESSAGE = 'ההצעה לא נשמרה. נסו שוב.';

export interface SaveQuoteVars {
  /** The device-generated UUID when creating; the quote's id when editing. */
  id: string;
  input: QuoteInput;
}

/**
 * Create or edit a quote (AC6), mirroring `useSaveClient`. On success a toast confirms it and the client's
 * quote list is invalidated so `client-quotes` picks it up. A 409 `version_conflict`, an offline save and any
 * other failure (including `validation_failed`) each show their Hebrew toast; the save sheet reads the thrown
 * error to stay open.
 */
export function useSaveQuote() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, input }: SaveQuoteVars) => putQuote(api, id, input),
    onSuccess: async (saved: Quote) => {
      toast.show(SAVED_MESSAGE);
      // Keep the per-quote detail cache in step with the server: an edit bumps `version`, and within the
      // query staleTime a re-reopen would otherwise seed the editor from the superseded quote and 409 the
      // next save as a false `version_conflict` (client-quotes AC4). The list refetches separately.
      queryClient.setQueryData(quoteDetailKey(saved.id), saved);
      await queryClient.invalidateQueries({ queryKey: quoteListKey(saved.clientId) });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'version_conflict') {
        toast.show(CONFLICT_MESSAGE, { kind: 'error' });
        return;
      }
      if (error instanceof NetworkError) {
        toast.show(OFFLINE_SAVE_MESSAGE, { kind: 'error' });
        return;
      }
      toast.show(SAVE_FAILED_MESSAGE, { kind: 'error' });
    },
  });
}
