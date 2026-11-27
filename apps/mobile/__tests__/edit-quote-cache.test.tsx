// covers client-quotes AC4 (regression) — editing a reopened quote twice in a row must not spuriously 409.
// useSaveQuote invalidated only the client's list, never the per-quote detail cache (quoteDetailKey). With the
// global staleTime (30s), a second reopen within that window served the STALE cached quote — old `version` and
// old items — so the next save sent the superseded version and the server rejected it with `version_conflict`.
// The fix writes the freshly-saved quote into the detail cache on success; this test pins that behavior.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Quote } from '@/api/quotes';
import { ToastProvider } from '@/ui';

import { quoteDetailKey, useSaveQuote } from '@/features/quotes';

jest.mock('@/auth/AuthProvider', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  const client = create({ baseUrl: 'http://api.test', getToken: async () => 'tok', onUnauthorized: () => {} });
  return {
    useApiClient: () => client,
    useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: jest.fn(), sessionExpired: jest.fn() }),
  };
});

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const QUOTE_ID = '22222222-2222-4222-8222-222222222222';

/** A stored quote as /quotes returns it, at a given version. */
function quote(version: number): Quote {
  return {
    id: QUOTE_ID,
    version,
    createdAt: '2026-11-26T12:00:00Z',
    updatedAt: '2026-11-26T12:30:00Z',
    clientId: CLIENT_ID,
    title: 'שרוול',
    notes: null,
    discountType: 'none',
    discountValue: 0,
    extraNeedles: 0,
    priceOverrideAgorot: null,
    computedPriceAgorot: 51500,
    finalPriceAgorot: 51500,
    estimatedMinutesTotal: 60,
    items: [],
  };
}

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 54, left: 0, right: 0, bottom: 34 } }}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  // PUT /quotes/{id} succeeds and returns the quote at the NEXT version, as the server would after an edit.
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    const method = init?.method ?? 'GET';
    if (method === 'PUT' && url.pathname === `/quotes/${QUOTE_ID}`) {
      return response(200, quote(5));
    }
    throw new Error(`unexpected request ${method} ${input}`);
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
  queryClient.clear();
});

describe('useSaveQuote keeps the quote detail cache fresh after an edit (client-quotes AC4 regression)', () => {
  it('writes the saved quote (new version) into quoteDetailKey so the next reopen is not stale', async () => {
    // A prior reopen cached the quote at version 4 (fresh for staleTime, so a re-reopen would reuse it).
    queryClient.setQueryData(quoteDetailKey(QUOTE_ID), quote(4));

    const { result } = await renderHook(() => useSaveQuote(), { wrapper });

    await result.current.mutateAsync({
      id: QUOTE_ID,
      input: { version: 4, clientId: CLIENT_ID, title: 'שרוול', notes: null, discountType: 'none', discountValue: 0, extraNeedles: 0, priceOverrideAgorot: null, items: [] },
    });

    // The detail cache must now hold version 5 — not the superseded version 4 that would 409 the next save.
    await waitFor(() => {
      expect(queryClient.getQueryData<Quote>(quoteDetailKey(QUOTE_ID))?.version).toBe(5);
    });
  });
});
