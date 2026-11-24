import { useMutation, useQueryClient } from '@tanstack/react-query';

import { NetworkError } from '@/api/client';
import { postConsent, type Client, type ConsentAction } from '@/api/clients';
import { useApiClient } from '@/auth/AuthProvider';
import { useToast } from '@/ui';

import { clientsKey } from '../useClients';
import { clientDetailKey } from './useClientCard';

export const CONSENT_UPDATED_MESSAGE = 'ההסכמה עודכנה';
export const OFFLINE_CONSENT_MESSAGE = 'אין חיבור לאינטרנט. ההסכמה לא עודכנה.';
export const CONSENT_FAILED_MESSAGE = 'ההסכמה לא עודכנה. נסו שוב.';

/**
 * Grants or withdraws a client's marketing consent (marketing-consent AC6). On success the card's cached
 * client becomes the response (its new `version`, so a later edit doesn't 409), the lists refetch, and the
 * toast shows. Offline or a server error → an error toast; the cache is untouched, so the row keeps its
 * old state. Nothing is queued.
 */
export function useChangeConsent(id: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (action: ConsentAction) => postConsent(api, id, action),
    onSuccess: async (client: Client) => {
      queryClient.setQueryData(clientDetailKey(id), client);
      toast.show(CONSENT_UPDATED_MESSAGE);
      await queryClient.invalidateQueries({ queryKey: [...clientsKey, 'list'] });
    },
    onError: (error) => {
      toast.show(error instanceof NetworkError ? OFFLINE_CONSENT_MESSAGE : CONSENT_FAILED_MESSAGE, { kind: 'error' });
    },
  });
}
