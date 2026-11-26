// covers client-quotes AC3/AC4 regressions found in code review: saving a reopened quote twice must send the
// bumped version (no false conflict), and switching between two cached reopened quotes must show the second
// quote's own items, not the first's. Also covers the Calculator tab press returning to a fresh calculator.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Client } from '@/api/clients';
import type { Quote } from '@/api/quotes';
import type { Settings } from '@/api/settings';
import { quoteDetailKey } from '@/features/quotes';
import { ToastProvider } from '@/ui';

import CalculatorTab from '../app/(tabs)/calculator';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '6f1c2c1e-0000-4000-8000-0000000000aa' }));

jest.mock('@/auth/AuthProvider', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  const client = create({ baseUrl: 'http://api.test', getToken: async () => 'tok', onUnauthorized: () => {} });
  return {
    useApiClient: () => client,
    useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: jest.fn(), sessionExpired: jest.fn() }),
  };
});

const mockSetParams = jest.fn();
let mockFocused = false;
let mockParams: { quoteId?: string } = {};
let mockTabPress: (() => void) | null = null;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({
    setParams: mockSetParams,
    isFocused: () => mockFocused,
    addListener: (event: string, cb: () => void) => {
      if (event === 'tabPress') mockTabPress = cb;
      return () => {
        if (mockTabPress === cb) mockTabPress = null;
      };
    },
  }),
}));

/** The seeded Settings row (fixtures/pricing-vectors.json → settings) plus the non-pricing fields. */
const SETTINGS: Settings = {
  id: '6f1c2c1e-0000-4000-8000-0000000000f0',
  version: 0,
  createdAt: '2026-11-25T10:00:00Z',
  updatedAt: '2026-11-25T10:00:00Z',
  minimumPriceAgorot: 35000,
  minimumMinutes: 30,
  hourlyRateAgorot: 33000,
  designHourlyRateAgorot: 20000,
  needleOpeningCostAgorot: 7000,
  extraNeedleCostAgorot: 5000,
  estimateTables: {
    sizeBaseMinutes: { XS: 20, S: 40, M: 75, L: 120, XL: 180 },
    detail: { simple: 0.8, medium: 1.0, high: 1.35 },
    shading: { none: 1.0, light: 1.2, full: 1.45 },
    placement: { easy: 1.0, medium: 1.1, hard: 1.25 },
  },
  calibrationPoints: [{ label: 'rose', minutes: 60 }],
  autoLockSeconds: 120,
  timezone: 'Asia/Jerusalem',
};

/** An existing client the search returns. */
const MAYA: Client = {
  id: '11111111-1111-4111-8111-111111111111',
  version: 3,
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-21T10:00:00Z',
  name: 'מאיה לוי',
  phone: '0501234567',
  email: null,
  instagram: null,
  notes: null,
  tattooCount: 0,
  marketingConsent: 'none',
  consentUpdatedAt: null,
};

function item(id: string, description: string): Quote['items'][number] {
  return {
    id,
    position: 0,
    description,
    size: 'M',
    detailLevel: 'simple',
    shading: 'none',
    bodyPlacement: 'forearm',
    designSource: 'artist_sketch',
    sketchId: null,
    designHours: null,
    estimatedMinutes: 60,
    estimatedMinutesOverride: null,
  };
}

function quote(id: string, description: string): Quote {
  return {
    id,
    version: 0,
    createdAt: '2026-11-26T12:00:00Z',
    updatedAt: '2026-11-26T12:00:00Z',
    clientId: MAYA.id,
    title: description,
    notes: null,
    discountType: 'none',
    discountValue: 0,
    extraNeedles: 0,
    priceOverrideAgorot: null,
    computedPriceAgorot: 51500,
    finalPriceAgorot: 51500,
    estimatedMinutesTotal: 60,
    items: [item(itemIdOf(id), description)],
  };
}

/** A valid UUID per quote's single item (the save path only reuses ids that are real UUIDs). */
function itemIdOf(quoteId: string): string {
  return `${quoteId.slice(0, 8)}-1111-4111-8111-111111111111`;
}

const QUOTE_A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const QUOTE_B = 'bbbbbbbb-0000-4000-8000-00000000000b';

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
/** The stored quotes; a PUT with the current version bumps it, a stale one is a 409 like the API. */
let stored: Record<string, Quote> = {};
let puts: Record<string, unknown>[] = [];

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
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
  mockParams = {};
  mockTabPress = null;
  mockFocused = false;
  mockSetParams.mockReset();
  stored = { [QUOTE_A]: quote(QUOTE_A, 'ורד'), [QUOTE_B]: quote(QUOTE_B, 'דרקון') };
  puts = [];
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    const method = init?.method ?? 'GET';
    const path = url.pathname;

    if (method === 'GET' && path === '/settings') return response(200, SETTINGS);
    if (method === 'GET' && path === '/clients') return response(200, []);
    if (method === 'GET' && path === `/clients/${MAYA.id}`) return response(200, MAYA);
    if (method === 'GET' && path === '/quotes') return response(200, Object.values(stored));

    if (path.startsWith('/quotes/')) {
      const id = path.slice('/quotes/'.length);
      if (method === 'GET') return response(200, stored[id]);
      if (method === 'PUT') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown> & { version?: number };
        puts.push(body);
        const current = stored[id];
        if (current && body.version !== current.version) {
          return response(409, { error: { code: 'version_conflict', message: 'stale', current } });
        }
        const next = { ...current, ...(body as unknown as Partial<Quote>), id, version: (current?.version ?? -1) + 1 } as Quote;
        stored[id] = next;
        return response(200, next);
      }
    }

    throw new Error(`unexpected request ${method} ${input}`);
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 30_000 } } });
});

afterEach(() => {
  queryClient.clear();
});

async function saveViaSheet() {
  await fireEvent.press(screen.getByRole('button', { name: 'שמירת הצעה' }));
  await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));
}

describe('reopen to edit (client-quotes AC3/AC4, review regressions)', () => {
  it('saves a reopened quote twice in place, sending the bumped version the second time', async () => {
    mockParams = { quoteId: QUOTE_A };
    await render(<CalculatorTab />, { wrapper: Providers });
    expect(await screen.findByLabelText('תיאור קעקוע 1')).toHaveDisplayValue('ורד');

    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 1'), 'ורד אדום');
    await saveViaSheet();
    await screen.findByText('ההצעה נשמרה');

    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 1'), 'ורד שחור');
    await saveViaSheet();
    await waitFor(() => expect(puts).toHaveLength(2));

    expect(puts.map((p) => p.version)).toEqual([0, 1]);
    expect(screen.queryByText('ההצעה עודכנה במכשיר אחר. נסו שוב.')).toBeNull();
    expect(stored[QUOTE_A].version).toBe(2);
  });

  it('shows the second quote’s own items when switching between two cached reopened quotes', async () => {
    mockParams = { quoteId: QUOTE_A };
    const view = await render(<CalculatorTab />, { wrapper: Providers });
    expect(await screen.findByLabelText('תיאור קעקוע 1')).toHaveDisplayValue('ורד');

    mockParams = { quoteId: QUOTE_B };
    await view.rerender(<CalculatorTab />);
    await waitFor(() => expect(screen.getByLabelText('תיאור קעקוע 1')).toHaveDisplayValue('דרקון'));

    // Back to A with both quotes (and the client) warm in the cache: no loading frame, so no remount for free.
    mockParams = { quoteId: QUOTE_A };
    await view.rerender(<CalculatorTab />);
    await waitFor(() => expect(screen.getByLabelText('תיאור קעקוע 1')).toHaveDisplayValue('ורד'));

    await saveViaSheet();
    await waitFor(() => expect(puts).toHaveLength(1));
    const items = puts[0].items as { id: string }[];
    expect(items.map((it) => it.id)).toEqual([itemIdOf(QUOTE_A)]);
  });

  it('coming back to the Calculator tab from another tab clears a reopened quote via the screen’s own navigation', async () => {
    mockParams = { quoteId: QUOTE_A };
    await render(<CalculatorTab />, { wrapper: Providers });
    await screen.findByLabelText('תיאור קעקוע 1');

    mockFocused = false; // the press fires while another tab is still focused
    expect(mockTabPress).not.toBeNull();
    mockTabPress?.();
    expect(mockSetParams).toHaveBeenCalledWith({ quoteId: undefined });
  });

  it('tapping the Calculator tab while already editing on it keeps the reopened quote (no lost edits)', async () => {
    mockParams = { quoteId: QUOTE_A };
    await render(<CalculatorTab />, { wrapper: Providers });
    await screen.findByLabelText('תיאור קעקוע 1');

    mockFocused = true;
    mockTabPress?.();
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it('pressing the Calculator tab on a fresh calculator leaves the params alone', async () => {
    await render(<CalculatorTab />, { wrapper: Providers });
    await screen.findByLabelText('זמן משוער');

    mockTabPress?.();
    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it('reopening a stale cached quote reseeds from the fresh version instead of pairing old content with it', async () => {
    // This device cached A at v0; another device has since saved A as v1 with different content.
    const cachedV0 = quote(QUOTE_A, 'ורד');
    stored[QUOTE_A] = { ...quote(QUOTE_A, 'ורד מהאייפד'), version: 1 };
    queryClient.setQueryData(quoteDetailKey(QUOTE_A), cachedV0, { updatedAt: 0 }); // long stale

    mockParams = { quoteId: QUOTE_A };
    await render(<CalculatorTab />, { wrapper: Providers });
    // The background refetch brings v1; the editor must show v1's content, not keep v0's.
    await waitFor(() => expect(screen.getByLabelText('תיאור קעקוע 1')).toHaveDisplayValue('ורד מהאייפד'));

    await saveViaSheet();
    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0].version).toBe(1);
    expect((puts[0].items as { description: string }[])[0].description).toBe('ורד מהאייפד');
  });
});
