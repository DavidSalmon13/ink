// covers client-list AC1, AC2, AC3, AC4, AC5, AC6, AC7, T3 — the Clients tab: list, search, create/edit modal.
// The form and the empty / no-results states have no mockup; the Hebrew copy here is the derived wording
// Aya approves in T12.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Client } from '@/api/clients';
import { ToastProvider } from '@/ui';

const NEW_ID = '6f1c2c1e-0000-4000-8000-0000000000aa';

jest.mock('expo-crypto', () => ({ randomUUID: () => '6f1c2c1e-0000-4000-8000-0000000000aa' }));

jest.mock('@/auth/AuthProvider', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  const client = create({ baseUrl: 'http://api.test', getToken: async () => 'tok', onUnauthorized: () => {} });
  return {
    useApiClient: () => client,
    useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: jest.fn(), sessionExpired: jest.fn() }),
  };
});

// Refetch-on-focus needs a navigator; the list's own fetch is what these tests exercise.
jest.mock('expo-router', () => ({
  ...jest.requireActual<object>('expo-router'),
  useFocusEffect: () => {},
}));

import ClientsTab from '../app/(tabs)/clients';

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function client(over: Partial<Client>): Client {
  return {
    id: '6f1c2c1e-0000-4000-8000-000000000001',
    version: 0,
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
    name: '',
    phone: null,
    email: null,
    instagram: null,
    notes: null,
    tattooCount: 0,
    ...over,
  };
}

const maya = client({ id: '6f1c2c1e-0000-4000-8000-0000000000c1', name: 'מאיה לוי', phone: '054-381-2290', version: 2, tattooCount: 3 });
const noa = client({ id: '6f1c2c1e-0000-4000-8000-0000000000c2', name: 'נועה ברק', tattooCount: 1 });
const shira = client({ id: '6f1c2c1e-0000-4000-8000-0000000000c3', name: 'שירה כהן', tattooCount: 0 });

/** Routes GET /clients[?q=] to `list(q)` and PUT /clients/{id} to `put(id, body)`. */
function serve({
  list = () => response(200, [maya, noa, shira]),
  put = (_id: string, body: Record<string, unknown>) => response(200, { ...maya, ...body, version: 0 }),
}: {
  list?: (q: string | null) => Response | Promise<Response>;
  put?: (id: string, body: Record<string, unknown>) => Response | Promise<Response>;
} = {}) {
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    if ((init?.method ?? 'GET') === 'GET' && url.pathname === '/clients') return list(url.searchParams.get('q'));
    if (init?.method === 'PUT' && url.pathname.startsWith('/clients/')) {
      return put(url.pathname.split('/')[2], JSON.parse(String(init.body)));
    }
    throw new Error(`unexpected request ${init?.method} ${input}`);
  });
}

function listQueries(): (string | null)[] {
  return mockFetch.mock.calls
    .filter(([, init]) => (init?.method ?? 'GET') === 'GET')
    .map(([input]) => new URL(input).searchParams.get('q'));
}

function puts(): { id: string; body: Record<string, unknown> }[] {
  return mockFetch.mock.calls
    .filter(([, init]) => init?.method === 'PUT')
    .map(([input, init]) => ({ id: new URL(input).pathname.split('/')[2], body: JSON.parse(String(init?.body)) }));
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
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(() => {
  queryClient.clear();
});

async function renderTab() {
  await render(<ClientsTab />, { wrapper: Providers });
}

// ---- AC4: list ----------------------------------------------------------------------------------

describe('client list', () => {
  it('shows the header, search and one row per client with the tattoo wording', async () => {
    serve();
    await renderTab();

    expect(screen.getByRole('header', { name: 'לקוחות' })).toBeOnTheScreen();
    expect(screen.getByRole('search', { name: 'חיפוש לקוח' })).toBeOnTheScreen();
    expect(await screen.findByText('מאיה לוי')).toBeOnTheScreen();
    expect(screen.getByText('3 קעקועים')).toBeOnTheScreen();
    expect(screen.getByText('נועה ברק')).toBeOnTheScreen();
    expect(screen.getByText('קעקוע אחד')).toBeOnTheScreen();
    expect(screen.getByText('שירה כהן')).toBeOnTheScreen();
    expect(screen.getByText('אין עדיין קעקועים')).toBeOnTheScreen();
  });
});

// ---- AC6: states --------------------------------------------------------------------------------

describe('list states', () => {
  it('shows the empty state with a "לקוח חדש" action when there are no clients', async () => {
    serve({ list: () => response(200, []) });
    await renderTab();

    expect(await screen.findByText('עדיין אין לקוחות')).toBeOnTheScreen();
    // The header button plus the empty state's action.
    expect(screen.getAllByRole('button', { name: 'לקוח חדש' }).length).toBeGreaterThanOrEqual(2);
  });

  it('shows an error state whose "נסו שוב" refetches', async () => {
    let fail = true;
    serve({ list: () => (fail ? response(500, { error: { code: 'internal_error', message: 'x' } }) : response(200, [maya])) });
    await renderTab();

    const retry = await screen.findByRole('button', { name: 'נסו שוב' });
    fail = false;
    await fireEvent.press(retry);

    expect(await screen.findByText('מאיה לוי')).toBeOnTheScreen();
  });
});

// ---- AC5 / AC6: search --------------------------------------------------------------------------

describe('search', () => {
  it('searches server-side once typing stops, not per keystroke', async () => {
    serve({ list: (q) => response(200, q ? [noa] : [maya, noa, shira]) });
    await renderTab();
    await screen.findByText('מאיה לוי');

    const search = screen.getByRole('search', { name: 'חיפוש לקוח' });
    await fireEvent.changeText(search, 'נ');
    await fireEvent.changeText(search, 'נוע');
    expect(listQueries()).not.toContain('נוע');

    await waitFor(() => expect(listQueries()).toContain('נוע'));
    expect(listQueries()).not.toContain('נ');
    await waitFor(() => expect(screen.queryByText('מאיה לוי')).not.toBeOnTheScreen());
    expect(screen.getByText('נועה ברק')).toBeOnTheScreen();
  });

  it('shows the no-results state with the query', async () => {
    serve({ list: (q) => response(200, q ? [] : [maya]) });
    await renderTab();
    await screen.findByText('מאיה לוי');

    await fireEvent.changeText(screen.getByRole('search', { name: 'חיפוש לקוח' }), 'זזז');

    expect(await screen.findByText('לא נמצאו לקוחות עבור ״זזז״')).toBeOnTheScreen();
  });
});

// ---- AC1 / AC2: create --------------------------------------------------------------------------

describe('create', () => {
  it('opens "לקוח חדש", enables "שמירה" once a name is typed, and PUTs a new device UUID', async () => {
    serve();
    await renderTab();
    await screen.findByText('מאיה לוי');

    await fireEvent.press(screen.getAllByRole('button', { name: 'לקוח חדש' })[0]);
    expect(await screen.findByRole('header', { name: 'לקוח חדש' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'שמירה' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('שם'), '  רוני אבן ');
    expect(screen.getByRole('button', { name: 'שמירה' })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0].id).toBe(NEW_ID);
    expect(puts()[0].body).toMatchObject({ name: 'רוני אבן' });
    expect(puts()[0].body).not.toHaveProperty('version');
    await waitFor(() => expect(screen.queryByRole('header', { name: 'לקוח חדש' })).not.toBeOnTheScreen());
  });

  it('renders the phone as a left-to-right run, unlike the Hebrew fields (AC10)', async () => {
    serve();
    await renderTab();
    await screen.findByText('מאיה לוי');

    await fireEvent.press(screen.getAllByRole('button', { name: 'לקוח חדש' })[0]);
    await screen.findByRole('header', { name: 'לקוח חדש' });

    expect(screen.getByLabelText('טלפון')).toHaveStyle({ writingDirection: 'ltr' });
    expect(screen.getByLabelText('שם')).not.toHaveStyle({ writingDirection: 'ltr' });
  });

  it('shows server validation errors inline in Hebrew and keeps the modal open', async () => {
    serve({
      put: () =>
        response(400, {
          error: { code: 'validation_failed', message: 'Invalid', details: { fields: { email: 'must be a well-formed email address' } } },
        }),
    });
    await renderTab();
    await screen.findByText('מאיה לוי');

    await fireEvent.press(screen.getAllByRole('button', { name: 'לקוח חדש' })[0]);
    await fireEvent.changeText(screen.getByLabelText('שם'), 'רוני אבן');
    await fireEvent.changeText(screen.getByLabelText('אימייל'), 'not-an-email');
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    expect(await screen.findByText('כתובת אימייל לא תקינה')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'לקוח חדש' })).toBeOnTheScreen();
  });

  it('shows an error toast when offline and keeps the modal open (no queued write)', async () => {
    serve({ put: () => Promise.reject(new TypeError('Network request failed')) });
    await renderTab();
    await screen.findByText('מאיה לוי');

    await fireEvent.press(screen.getAllByRole('button', { name: 'לקוח חדש' })[0]);
    await fireEvent.changeText(screen.getByLabelText('שם'), 'רוני אבן');
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    expect(await screen.findByText('אין חיבור לאינטרנט. הלקוח לא נשמר.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'לקוח חדש' })).toBeOnTheScreen();
    expect(puts()).toHaveLength(1);
  });
});

// ---- AC3: edit ----------------------------------------------------------------------------------

describe('edit', () => {
  it('opens "עריכת לקוח" prefilled from the row and PUTs with the last-seen version', async () => {
    serve();
    await renderTab();

    await fireEvent.press(await screen.findByText('מאיה לוי'));
    expect(await screen.findByRole('header', { name: 'עריכת לקוח' })).toBeOnTheScreen();
    expect(screen.getByLabelText('שם')).toHaveDisplayValue('מאיה לוי');
    expect(screen.getByLabelText('טלפון')).toHaveDisplayValue('054-381-2290');

    await fireEvent.changeText(screen.getByLabelText('טלפון'), '052-111-2233');
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0].id).toBe(maya.id);
    expect(puts()[0].body).toMatchObject({ name: 'מאיה לוי', phone: '052-111-2233', version: 2 });
  });

  it('on a 409 shows the conflict toast and reloads the form with the current values', async () => {
    const current = { ...maya, name: 'מאיה לוי-כהן', version: 3 };
    serve({
      put: () => response(409, { error: { code: 'version_conflict', message: 'Version conflict', details: { current } } }),
    });
    await renderTab();

    await fireEvent.press(await screen.findByText('מאיה לוי'));
    await fireEvent.changeText(screen.getByLabelText('הערות'), 'מהאייפון');
    await fireEvent.press(screen.getByRole('button', { name: 'שמירה' }));

    expect(await screen.findByText('הלקוח עודכן במכשיר אחר. הנתונים רועננו.')).toBeOnTheScreen();
    expect(screen.getByLabelText('שם')).toHaveDisplayValue('מאיה לוי-כהן');
    expect(screen.getByRole('header', { name: 'עריכת לקוח' })).toBeOnTheScreen();
  });
});
