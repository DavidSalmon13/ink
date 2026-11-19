import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { ApiError, NetworkError } from '@/api/client';
import { listClients, putClient, type Client, type ClientInput } from '@/api/clients';
import { useApiClient } from '@/auth/AuthProvider';
import { useToast } from '@/ui';

/** Every client list query (any search) lives under this key. */
export const clientsKey = ['clients'] as const;
export const clientListKey = (q: string) => [...clientsKey, 'list', q.trim()] as const;

export const CONFLICT_MESSAGE = 'הלקוח עודכן במכשיר אחר. הנתונים רועננו.';
export const OFFLINE_SAVE_MESSAGE = 'אין חיבור לאינטרנט. הלקוח לא נשמר.';
export const SAVE_FAILED_MESSAGE = 'הלקוח לא נשמר. נסו שוב.';

/**
 * The client list, searched on the server when `q` isn't blank (AC4, AC5). The previous result stays
 * on screen while a new search loads. Debouncing the typed text is the screen's job.
 */
export function useClients(q: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: clientListKey(q),
    queryFn: () => listClients(api, q),
    placeholderData: keepPreviousData,
  });
}

/** The current record a 409 `version_conflict` carries in `details.current`, if this error is one. */
export function conflictCurrent(error: unknown): Client | null {
  if (error instanceof ApiError && error.code === 'version_conflict') {
    const current = error.details?.current;
    if (current && typeof current === 'object') return current as Client;
  }
  return null;
}

/** Replaces this client in every cached list (by id), and in its card's cached record. */
function replaceInLists(queryClient: QueryClient, client: Client) {
  queryClient.setQueriesData<Client[]>({ queryKey: [...clientsKey, 'list'] }, (old) =>
    old?.map((c) => (c.id === client.id ? client : c)),
  );
  queryClient.setQueryData<Client>([...clientsKey, 'detail', client.id], (old) => (old ? client : old));
}

export interface SaveClientVars {
  /** The device-generated UUID when creating; the client's id when editing. */
  id: string;
  input: ClientInput;
}

/**
 * Create or edit a client (AC1, AC3). On success the lists refetch. On a 409 the cached lists take
 * `details.current` and the conflict toast shows; read it with `conflictCurrent(error)` to reload the
 * form. Offline → an error toast and nothing is queued (AC7). Validation errors (`validation_failed`)
 * are left to the form, which shows them inline.
 */
export function useSaveClient() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, input }: SaveClientVars) => putClient(api, id, input),
    onSuccess: async (saved) => {
      replaceInLists(queryClient, saved);
      await queryClient.invalidateQueries({ queryKey: clientsKey });
    },
    onError: (error) => {
      const current = conflictCurrent(error);
      if (current) {
        replaceInLists(queryClient, current);
        toast.show(CONFLICT_MESSAGE);
        return;
      }
      if (error instanceof NetworkError) {
        toast.show(OFFLINE_SAVE_MESSAGE, { kind: 'error' });
        return;
      }
      if (error instanceof ApiError && error.code === 'validation_failed') return;
      toast.show(SAVE_FAILED_MESSAGE, { kind: 'error' });
    },
  });
}
