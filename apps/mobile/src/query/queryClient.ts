import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { Platform } from 'react-native';

/** How long a persisted read (e.g. the last client list) stays usable offline. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** AsyncStorage key of the persisted cache. */
export const CACHE_KEY = 'ink.query-cache';
/** Bump when a cached response shape changes, so an old persisted copy is discarded. */
export const CACHE_BUSTER = '1';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // gcTime ≥ the persisted max age, or restored data would be collected before it's read.
      queries: { gcTime: CACHE_MAX_AGE_MS, staleTime: 30_000, retry: 1 },
      // No queued or retried writes (client-list AC7): a failed save is reported, not replayed.
      mutations: { retry: false },
    },
  });
}

/** The AsyncStorage persister on iPhone/iPad; null on web, where nothing is persisted (AC7). */
export function createPersister(os: string = Platform.OS): Persister | null {
  if (os === 'web') return null;
  return createAsyncStoragePersister({ storage: AsyncStorage, key: CACHE_KEY });
}

export const queryClient = createQueryClient();
export const persister = createPersister();

/** Logout: drop every cached query and the persisted copy, so the next session starts empty (AC7). */
export async function clearQueryCache(client: QueryClient = queryClient, store: Persister | null = persister) {
  await client.cancelQueries();
  client.clear();
  await store?.removeClient();
}
