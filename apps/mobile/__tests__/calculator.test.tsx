// covers calculator-preview AC4, AC5, AC6, T8 — the Calculator tab: item editors recompute live, the
// override and "similar" hint, the %/₪ discount and manual price, and the copy-to-clipboard text.
// The seeded Settings mirror fixtures/pricing-vectors.json so the numbers match the shared vectors.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Settings } from '@/api/settings';
import { formatMoney, ltrIsolate } from '@/theme';
import { ToastProvider } from '@/ui';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

jest.mock('@/auth/AuthProvider', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  const client = create({ baseUrl: 'http://api.test', getToken: async () => 'tok', onUnauthorized: () => {} });
  return {
    useApiClient: () => client,
    useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: jest.fn(), sessionExpired: jest.fn() }),
  };
});

import * as Clipboard from 'expo-clipboard';

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
  calibrationPoints: [
    { label: 'arm', minutes: 180 },
    { label: 'back', minutes: 180 },
    { label: 'cherry', minutes: 80 },
    { label: 'figure with book', minutes: 120 },
    { label: 'rose', minutes: 60 },
    { label: 'deer', minutes: 120 },
  ],
  autoLockSeconds: 120,
  timezone: 'Asia/Jerusalem',
};

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Money as the summary renders it (Num → formatMoney → isolated LTR run). */
const money = (agorot: number) => ltrIsolate(formatMoney(agorot));
/** A minutes value as a summary Num renders it ("<n> דק׳", isolated). */
const minutes = (n: number) => ltrIsolate(`${n} דק׳`);

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
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    if ((init?.method ?? 'GET') === 'GET' && url.pathname === '/settings') return response(200, SETTINGS);
    throw new Error(`unexpected request ${init?.method} ${input}`);
  });
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  (Clipboard.setStringAsync as jest.Mock).mockClear();
});

afterEach(() => {
  queryClient.clear();
});

/** Renders the tab and waits for the seeded settings to load (the first estimate field appears). */
async function renderCalculator() {
  await render(<CalculatorTab />, { wrapper: Providers });
  return screen.findByLabelText('זמן משוער');
}

// ---- AC4: live recompute + override + hint -------------------------------------------------------

describe('item editor', () => {
  it('prefills the estimate and recomputes it live when a control changes', async () => {
    // M · simple · none · forearm → roundUpTo5(75 × 0.8) = 60; summary visit = 60 דק׳.
    const field = await renderCalculator();
    expect(field).toHaveDisplayValue('60');
    expect(screen.getByText(minutes(60))).toBeOnTheScreen();

    // Detail → high: roundUpTo5(75 × 1.35) = 105.
    await fireEvent.press(screen.getByRole('radio', { name: 'גבוהה' }));
    expect(screen.getByLabelText('זמן משוער')).toHaveDisplayValue('105');
    expect(screen.getByText(minutes(105))).toBeOnTheScreen();
  });

  it('shows the "similar" hint from the pre-override estimate, and the override drives the visit time', async () => {
    const field = await renderCalculator();
    // Estimate 60 → nearest calibration point is rose (60).
    expect(screen.getByText('דומה: ורד ≈ 60 דק׳')).toBeOnTheScreen();

    await fireEvent.changeText(field, '90');
    // The visit minutes follow the override…
    expect(screen.getByText(minutes(90))).toBeOnTheScreen();
    // …but the hint still reflects the estimate (60), not the override.
    expect(screen.getByText('דומה: ורד ≈ 60 דק׳')).toBeOnTheScreen();
  });

  it('adds and removes tattoo cards with "קעקוע נוסף"', async () => {
    await renderCalculator();
    expect(screen.queryByLabelText('תיאור קעקוע 2')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'קעקוע נוסף' }));
    expect(screen.getByLabelText('תיאור קעקוע 2')).toBeOnTheScreen();

    // With two items each card offers a remove button; removing the second leaves one.
    await fireEvent.press(screen.getAllByLabelText('הסרת הקעקוע')[1]);
    expect(screen.queryByLabelText('תיאור קעקוע 2')).not.toBeOnTheScreen();
  });
});

// ---- AC5: options + summary ---------------------------------------------------------------------

describe('options and summary', () => {
  it('applies an amount (₪) discount to the whole visit', async () => {
    await renderCalculator();
    // base for the default item = 35,000 + (60 − 30) × 550 = 51,500 agorot (515 ₪).
    await fireEvent.press(screen.getByRole('radio', { name: '₪' }));
    await fireEvent.changeText(screen.getByLabelText('סכום הנחה'), '95');

    expect(screen.getByText(money(-9500))).toBeOnTheScreen(); // −95 ₪ discount row
    expect(screen.getByText(money(42000))).toBeOnTheScreen(); // 515 − 95 = 420 ₪ total
  });

  it('applies a percent (%) discount', async () => {
    await renderCalculator();
    // 10% of 51,500 = 5,150 → computed 46,350 (463.50 ₪).
    await fireEvent.changeText(screen.getByLabelText('סכום הנחה'), '10');
    expect(screen.getByText(money(46350))).toBeOnTheScreen();
  });

  it('lets a manual price override the computed total', async () => {
    await renderCalculator();
    await fireEvent.changeText(screen.getByLabelText('מחיר ידני'), '300');
    expect(screen.getByText(money(30000))).toBeOnTheScreen(); // 300 ₪ total
  });
});

// ---- AC6: copy, no client -----------------------------------------------------------------------

describe('copy quote', () => {
  it('copies itemized Hebrew text and shows the toast, with no save button', async () => {
    const field = await renderCalculator();

    await fireEvent.changeText(screen.getByLabelText('תיאור קעקוע 1'), 'ורד');
    await fireEvent.press(screen.getByRole('radio', { name: 'עדינות' })); // shading light → estimate 75
    expect(field).toHaveDisplayValue('75');

    await fireEvent.press(screen.getByRole('button', { name: 'העתקת הצעה' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      ['הצעת מחיר', '', 'ורד · M · עדינות · 75 דק׳', '', 'משך ביקור: 75 דק׳', 'סה״כ: 597.50 ₪'].join('\n'),
    );
    expect(await screen.findByText('ההצעה הועתקה')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'שמירת הצעה' })).not.toBeOnTheScreen();
  });
});
