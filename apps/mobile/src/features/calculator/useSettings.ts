import { useQuery } from '@tanstack/react-query';

import { getSettings } from '@/api/settings';
import { useApiClient } from '@/auth/AuthProvider';

/** The studio's single Settings record lives under this key. */
export const settingsKey = ['settings'] as const;

/**
 * The seeded Settings record — the read-only source the pricing module prices from (AC7). The feature
 * reads settings only through this hook, so it never touches api-conventions' `settings.ts`.
 */
export function useSettings() {
  const api = useApiClient();
  return useQuery({
    queryKey: settingsKey,
    queryFn: () => getSettings(api),
  });
}
