import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/auth/AuthProvider';

import { CACHE_BUSTER, CACHE_MAX_AGE_MS, clearQueryCache, persister, queryClient } from './queryClient';

/**
 * TanStack Query for the app (architecture.md → Data Flow). On iPhone/iPad the cache is persisted to
 * AsyncStorage and restored on launch; on web it lives in memory only. Whenever the session ends
 * (logout or an expired token) the cache and its persisted copy are cleared (client-list AC7).
 * Mount inside <AuthProvider>.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'signedOut') void clearQueryCache().catch(() => {});
  }, [status]);

  if (!persister) return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE_MS, buster: CACHE_BUSTER }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
