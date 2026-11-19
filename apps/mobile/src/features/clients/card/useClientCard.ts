import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, NetworkError } from '@/api/client';
import { deleteClient, getClient, getClientSummary } from '@/api/clients';
import { useApiClient } from '@/auth/AuthProvider';
import { useToast } from '@/ui';

import { clientsKey } from '../useClients';

/** Under `clientsKey`, so a save (which invalidates `clientsKey`) refreshes the open card too. */
export const clientDetailKey = (id: string) => [...clientsKey, 'detail', id] as const;
export const clientSummaryKey = (id: string) => [...clientsKey, 'summary', id] as const;

export const CLIENT_DELETED_MESSAGE = 'הלקוח נמחק';
export const OFFLINE_DELETE_MESSAGE = 'אין חיבור לאינטרנט. הלקוח לא נמחק.';
export const DELETE_FAILED_MESSAGE = 'הלקוח לא נמחק. נסו שוב.';

/** A deleted (or never-synced) client: retrying won't bring it back (AC8). */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'not_found';
}

const retryUnlessNotFound = (failureCount: number, error: unknown) => !isNotFound(error) && failureCount < 1;

/** One client for the card (AC2); ApiError `not_found` once it's deleted on any device (AC8). */
export function useClient(id: string) {
  const api = useApiClient();
  return useQuery({ queryKey: clientDetailKey(id), queryFn: () => getClient(api, id), retry: retryUnlessNotFound });
}

/** The card's summary tiles (AC4). */
export function useClientSummary(id: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: clientSummaryKey(id),
    queryFn: () => getClientSummary(api, id),
    retry: retryUnlessNotFound,
  });
}

/**
 * Soft-deletes a client (AC7). On success: the toast, its card queries dropped (so nothing refetches a
 * 404), and the lists refetched without it. Offline → an error toast and nothing is queued.
 */
export function useDeleteClient() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteClient(api, id),
    onSuccess: async (_void, id) => {
      queryClient.removeQueries({ queryKey: clientDetailKey(id) });
      queryClient.removeQueries({ queryKey: clientSummaryKey(id) });
      toast.show(CLIENT_DELETED_MESSAGE);
      await queryClient.invalidateQueries({ queryKey: [...clientsKey, 'list'] });
    },
    onError: (error) => {
      toast.show(error instanceof NetworkError ? OFFLINE_DELETE_MESSAGE : DELETE_FAILED_MESSAGE, { kind: 'error' });
    },
  });
}
