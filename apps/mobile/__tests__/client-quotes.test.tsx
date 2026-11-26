// covers client-quotes AC1, AC2, T1 — the client-card Quotes tab list: loading / error(retry) / empty /
// populated states, newest-first order, the final ₪ on each row, and delete-with-confirm invalidating the
// list. Mirrors save-quote.test.tsx's harness (QueryClient + ToastProvider + SafeAreaProvider, a mocked
// useApiClient, and a mockFetch over /quotes). The components under test (ClientQuotes / QuoteRow /
// useClientQuotes) don't exist yet, so this suite is RED until T2–T5 land.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Quote } from '@/api/quotes';
import { formatMoney } from '@/theme';
import { ToastProvider } from '@/ui';

import { ClientQuotes } from '@/features/quotes/ClientQuotes';

jest.mock('@/auth/AuthProvider', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  const client = create({ baseUrl: 'http://api.test', getToken: async () => 'tok', onUnauthorized: () => {} });
  return {
    useApiClient: () => client,
    useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: jest.fn(), sessionExpired: jest.fn() }),
  };
});

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';

/** One stored quote as /quotes returns it; prices are the server's authoritative recompute. */
function quote(over: Partial<Quote>): Quote {
  return {
    id: 'q-0',
    version: 0,
    createdAt: '2026-11-26T12:00:00Z',
    updatedAt: '2026-11-26T12:00:00Z',
    clientId: CLIENT_ID,
    title: 'הצעה',
    notes: null,
    discountType: 'none',
    discountValue: 0,
    extraNeedles: 0,
    priceOverrideAgorot: null,
    computedPriceAgorot: 51500,
    finalPriceAgorot: 51500,
    estimatedMinutesTotal: 60,
    items: [],
    ...over,
  };
}

// Newest first, as the API lists them.
const NEWER = quote({ id: 'q-newer', title: 'שרוול יד', finalPriceAgorot: 51500 });
const OLDER = quote({ id: 'q-older', title: 'ורד קטן', finalPriceAgorot: 28000 });

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
/** The live list the mock serves and mutates on DELETE, so a refetch reflects the soft delete. */
let serverQuotes: Quote[] = [];
/** When true, the next GET /quotes fails once (for the error → retry path). */
let failNextList = false;
/** Ids the mock received a DELETE for. */
let deleted: string[] = [];

function response(status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let queryClient: QueryClient;

function Providers({ children }: { children: ReactNode }) {
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
  serverQuotes = [NEWER, OLDER];
  failNextList = false;
  deleted = [];
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    const method = init?.method ?? 'GET';
    const path = url.pathname;

    if (method === 'GET' && path === '/quotes') {
      if (failNextList) {
        failNextList = false;
        return response(500, { code: 'internal', message: 'boom' });
      }
      const clientId = url.searchParams.get('clientId');
      return response(200, clientId === CLIENT_ID ? serverQuotes : []);
    }

    if (method === 'DELETE' && path.startsWith('/quotes/')) {
      const id = path.slice('/quotes/'.length);
      deleted.push(id);
      serverQuotes = serverQuotes.filter((q) => q.id !== id);
      return response(204, null);
    }

    throw new Error(`unexpected request ${method} ${input}`);
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
  queryClient.clear();
});

/** Finds a text node whose content includes `needle` (prices are wrapped in LTR-isolate chars). */
const textIncluding = (needle: string) => (content: string) => content.includes(needle);

describe('client quotes list (client-quotes AC1)', () => {
  it('shows the loading state while the list is fetching', () => {
    render(<ClientQuotes clientId={CLIENT_ID} />, { wrapper: Providers });
    expect(screen.getByLabelText('טוען…')).toBeOnTheScreen();
  });

  it('shows the empty state when the client has no quotes', async () => {
    serverQuotes = [];
    render(<ClientQuotes clientId={CLIENT_ID} />, { wrapper: Providers });
    expect(await screen.findByText('עדיין אין הצעות מחיר')).toBeOnTheScreen();
  });

  it('lists the client quotes newest-first, each with its title and final ₪', async () => {
    render(<ClientQuotes clientId={CLIENT_ID} />, { wrapper: Providers });

    await screen.findByLabelText(`הצעה: ${NEWER.title}`);
    const rows = screen.getAllByLabelText(/^הצעה: /).map((n) => n.props.accessibilityLabel);
    expect(rows).toEqual([`הצעה: ${NEWER.title}`, `הצעה: ${OLDER.title}`]);

    // formatMoney(51500) === "515 ₪" / formatMoney(28000) === "280 ₪"
    expect(screen.getByText(textIncluding(formatMoney(NEWER.finalPriceAgorot)))).toBeOnTheScreen();
    expect(screen.getByText(textIncluding(formatMoney(OLDER.finalPriceAgorot)))).toBeOnTheScreen();
  });

  it('shows an error state with retry, and recovers on retry', async () => {
    failNextList = true;
    render(<ClientQuotes clientId={CLIENT_ID} />, { wrapper: Providers });

    await screen.findByText('לא הצלחנו לטעון את ההצעות');
    fireEvent.press(screen.getByRole('button', { name: 'נסו שוב' }));

    expect(await screen.findByLabelText(`הצעה: ${NEWER.title}`)).toBeOnTheScreen();
  });
});

describe('delete a quote (client-quotes AC2)', () => {
  it('deletes a quote after confirm and drops it from the list', async () => {
    render(<ClientQuotes clientId={CLIENT_ID} />, { wrapper: Providers });
    await screen.findByLabelText(`הצעה: ${OLDER.title}`);

    fireEvent.press(screen.getByLabelText(`מחיקת הצעה: ${OLDER.title}`));
    fireEvent.press(await screen.findByRole('button', { name: 'מחיקה' }));

    await waitFor(() => expect(deleted).toContain(OLDER.id));
    await waitFor(() => expect(screen.queryByLabelText(`הצעה: ${OLDER.title}`)).toBeNull());
    expect(screen.getByLabelText(`הצעה: ${NEWER.title}`)).toBeOnTheScreen();
  });
});
