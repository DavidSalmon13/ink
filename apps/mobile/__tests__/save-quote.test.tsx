// covers save-quote AC6, T8/T9 — the client picker + save-from-calculator flow on the Calculator tab:
// picking an existing client, adding a new one, the title default, the QuoteInput built from the calculator
// state, the "no client → disabled" rule and the success toast. Reuses calculator.test.tsx's harness so the
// seeded Settings mirror fixtures/pricing-vectors.json.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Client } from '@/api/clients';
import type { Settings } from '@/api/settings';
import { ToastProvider } from '@/ui';

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

import CalculatorTab from '../app/(tabs)/calculator';

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

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
/** The last body PUT to /quotes/{id}, captured so a test can assert the serialized QuoteInput. */
let lastQuotePut: Record<string, unknown> | null = null;

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
  lastQuotePut = null;
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    const method = init?.method ?? 'GET';
    const path = url.pathname;

    if (method === 'GET' && path === '/settings') return response(200, SETTINGS);

    // Client search: a blank query (the mount) returns nothing; "מאיה" matches Maya.
    if (method === 'GET' && path === '/clients') {
      const q = url.searchParams.get('q') ?? '';
      return response(200, q && MAYA.name.includes(q) ? [MAYA] : []);
    }

    // New client: echo the request back as a saved client at version 0.
    if (method === 'PUT' && path.startsWith('/clients/')) {
      const body = JSON.parse(String(init?.body)) as { name: string };
      const id = path.slice('/clients/'.length);
      return response(200, { ...MAYA, id, name: body.name, phone: null, version: 0 });
    }

    // Save quote: capture the body and echo a stored quote (prices are the server's to compute).
    if (method === 'PUT' && path.startsWith('/quotes/')) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      lastQuotePut = body;
      const id = path.slice('/quotes/'.length);
      const items = (body.items as Record<string, unknown>[]).map((it) => ({
        ...it,
        sketchId: null,
        estimatedMinutes: 60,
      }));
      return response(200, {
        id,
        version: 0,
        createdAt: '2026-11-25T12:00:00Z',
        updatedAt: '2026-11-25T12:00:00Z',
        computedPriceAgorot: 51500,
        finalPriceAgorot: 51500,
        estimatedMinutesTotal: 60,
        priceOverrideAgorot: null,
        notes: null,
        ...body,
        items,
      });
    }

    throw new Error(`unexpected request ${method} ${input}`);
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
  queryClient.clear();
});

/** Renders the tab and waits for the seeded settings to load (the first estimate field appears). */
async function renderCalculator() {
  await render(<CalculatorTab />, { wrapper: Providers });
  await screen.findByLabelText('זמן משוער');
}

/** Types into the client search and taps the matching result row, leaving that client picked. */
async function pickMaya() {
  await fireEvent.changeText(screen.getByLabelText('חיפוש לקוח'), 'מאיה');
  await fireEvent.press(await screen.findByRole('button', { name: MAYA.name }));
  await screen.findByLabelText(`לקוח נבחר: ${MAYA.name}`);
}

describe('save quote (save-quote AC6)', () => {
  it('disables "שמירת הצעה" until a client is chosen, then enables it', async () => {
    await renderCalculator();
    expect(screen.getByRole('button', { name: 'שמירת הצעה' })).toBeDisabled();

    await pickMaya();
    expect(screen.getByRole('button', { name: 'שמירת הצעה' })).toBeEnabled();
  });

  it('picks an existing client from the search and shows the pill', async () => {
    await renderCalculator();

    await fireEvent.changeText(screen.getByLabelText('חיפוש לקוח'), 'מאיה');
    await fireEvent.press(await screen.findByRole('button', { name: MAYA.name }));

    // The pill now names the picked client, and the search box has been cleared.
    expect(screen.getByLabelText(`לקוח נבחר: ${MAYA.name}`)).toBeOnTheScreen();
    expect(screen.getByLabelText('חיפוש לקוח')).toHaveDisplayValue('');
  });

  it('adds a new client via "לקוח חדש" and picks it', async () => {
    await renderCalculator();

    await fireEvent.press(screen.getByRole('button', { name: 'לקוח חדש' }));
    await fireEvent.changeText(screen.getByLabelText('שם'), 'דנה כהן');
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    expect(await screen.findByLabelText('לקוח נבחר: דנה כהן')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'שמירת הצעה' })).toBeEnabled();
  });

  it('defaults the save title to the joined item descriptions and lets it be edited', async () => {
    await renderCalculator();
    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 1'), 'ורד');
    await fireEvent.press(screen.getByRole('button', { name: 'קעקוע נוסף' }));
    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 2'), 'דרקון');
    await pickMaya();

    await fireEvent.press(screen.getByRole('button', { name: 'שמירת הצעה' }));

    const title = await screen.findByLabelText('כותרת');
    expect(title).toHaveDisplayValue('ורד, דרקון');
    await fireEvent.changeText(title, 'שרוול');
    expect(title).toHaveDisplayValue('שרוול');
  });

  it('builds the QuoteInput PUT body from the calculator state', async () => {
    await renderCalculator();
    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 1'), 'ורד');
    // An amount (₪) discount of 95 → discountType "amount", discountValue 9500 agorot.
    await fireEvent.press(screen.getByRole('radio', { name: '₪' }));
    await fireEvent.changeText(screen.getByLabelText('סכום הנחה'), '95');
    await pickMaya();

    await fireEvent.press(screen.getByRole('button', { name: 'שמירת הצעה' }));
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));
    await screen.findByText('ההצעה נשמרה');

    expect(lastQuotePut).toMatchObject({
      clientId: MAYA.id,
      title: 'ורד',
      discountType: 'amount',
      discountValue: 9500,
      extraNeedles: 0,
    });
    const items = lastQuotePut?.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      position: 0,
      description: 'ורד',
      size: 'M',
      detailLevel: 'simple',
      shading: 'none',
      bodyPlacement: 'forearm', // the raw placement id — the server resolves the time tier
      designSource: 'artist_sketch',
    });
    expect(typeof items[0].id).toBe('string');
  });

  it('shows a success toast after saving', async () => {
    await renderCalculator();
    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 1'), 'ורד');
    await pickMaya();

    await fireEvent.press(screen.getByRole('button', { name: 'שמירת הצעה' }));
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    expect(await screen.findByText('ההצעה נשמרה')).toBeOnTheScreen();
  });
});
