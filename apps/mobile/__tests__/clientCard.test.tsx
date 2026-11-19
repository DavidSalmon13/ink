// covers client-card AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, T2 — the client card, its actions, the
// iPhone route and the iPad split. The contact sheet, delete confirmation and empty / not-found /
// no-selection states have no mockup; the Hebrew copy here is the derived wording Aya approves in T12.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Client } from '@/api/clients';
import { ToastProvider } from '@/ui';

jest.mock('@/auth/AuthProvider', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@/api/client')>('@/api/client');
  const client = create({ baseUrl: 'http://api.test', getToken: async () => 'tok', onUnauthorized: () => {} });
  return {
    useApiClient: () => client,
    useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: jest.fn(), sessionExpired: jest.fn() }),
  };
});

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  ...jest.requireActual<object>('expo-router'),
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

const mockOpenURL = jest.fn<(url: string) => Promise<true>>();
jest.mock('expo-linking', () => ({ openURL: (url: string) => mockOpenURL(url) }));

jest.mock('expo-crypto', () => ({ randomUUID: () => '6f1c2c1e-0000-4000-8000-0000000000aa' }));

import ClientsTab from '../app/(tabs)/clients';
import ClientRoute from '../app/clients/[id]';
import {
  ClientCard,
  CLIENT_DELETED_MESSAGE,
  LINK_FAILED_MESSAGE,
  OFFLINE_DELETE_MESSAGE,
} from '@/features/clients';

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function client(over: Partial<Client>): Client {
  return {
    id: '6f1c2c1e-0000-4000-8000-000000000001',
    version: 0,
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
    name: '',
    phone: null,
    email: null,
    instagram: null,
    notes: null,
    tattooCount: 0,
    ...over,
  };
}

const maya = client({
  id: '6f1c2c1e-0000-4000-8000-0000000000c1',
  name: 'מאיה לוי',
  phone: '054-381-2290',
  instagram: 'maya.lines',
  notes: 'מעדיפה קו דק',
  version: 2,
});
const noa = client({ id: '6f1c2c1e-0000-4000-8000-0000000000c2', name: 'נועה ברק' });
const EMPTY_SUMMARY = { tattooCount: 0, completedIncomeAgorot: 0, nextAppointmentAt: null };

/**
 * Routes GET /clients, GET /clients/{id}, GET /clients/{id}/summary, PUT and DELETE /clients/{id}.
 * `clients` is the server's live set; DELETE removes from it, so later reads 404 and the list shrinks.
 */
function serve({ clients = [maya, noa], del }: { clients?: Client[]; del?: () => Response | Promise<Response> } = {}) {
  let live = [...clients];
  mockFetch.mockImplementation(async (input, init) => {
    const url = new URL(input);
    const method = init?.method ?? 'GET';
    const [, , id, sub] = url.pathname.split('/');
    if (method === 'GET' && url.pathname === '/clients') return response(200, live);
    const found = live.find((c) => c.id === id);
    if (method === 'GET' && sub === 'summary') {
      return found ? response(200, EMPTY_SUMMARY) : response(404, { error: { code: 'not_found', message: 'Not found' } });
    }
    if (method === 'GET' && id) {
      return found ? response(200, found) : response(404, { error: { code: 'not_found', message: 'Not found' } });
    }
    if (method === 'DELETE' && id) {
      if (del) return del();
      live = live.filter((c) => c.id !== id);
      return new Response(null, { status: 204 });
    }
    if (method === 'PUT' && id) return response(200, { ...found, ...JSON.parse(String(init?.body)) });
    throw new Error(`unexpected request ${method} ${input}`);
  });
}

function calls(method: string) {
  return mockFetch.mock.calls
    .filter(([, init]) => (init?.method ?? 'GET') === method)
    .map(([input]) => new URL(input).pathname);
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

function setWidth(width: number, height: number) {
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 1 },
    screen: { width, height, scale: 2, fontScale: 1 },
  });
}

const onGone = jest.fn();

async function renderCard(id = maya.id, pane = false) {
  await render(<ClientCard id={id} onGone={onGone} pane={pane} />, { wrapper: Providers });
  if (id === maya.id) await screen.findByRole('header', { name: 'מאיה לוי' });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockOpenURL.mockReset();
  mockOpenURL.mockResolvedValue(true);
  onGone.mockReset();
  mockRouter.push.mockReset();
  mockRouter.back.mockReset();
  mockParams = {};
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  setWidth(393, 852);
});

afterEach(() => {
  queryClient.clear();
});

// ---- AC2: header --------------------------------------------------------------------------------

describe('header', () => {
  it('shows the name, "לקוח/ה מאז <month year>" and the phone and Instagram chips', async () => {
    serve();
    await renderCard();

    expect(screen.getByText('לקוח/ה מאז מרץ 2026')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /054-381-2290/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /@maya\.lines/ })).toBeOnTheScreen();
  });

  it('leaves out the chips for fields that are not set', async () => {
    serve();
    await render(<ClientCard id={noa.id} onGone={onGone} />, { wrapper: Providers });
    await screen.findByRole('header', { name: 'נועה ברק' });

    expect(screen.queryByRole('button', { name: /@/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /\d{3}-/ })).not.toBeOnTheScreen();
  });
});

// ---- AC3: contacts ------------------------------------------------------------------------------

describe('contacts', () => {
  it('the phone chip offers a call and WhatsApp in international form', async () => {
    serve();
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: /054-381-2290/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'התקשרות' }));
    expect(mockOpenURL).toHaveBeenCalledWith('tel:0543812290');

    await fireEvent.press(screen.getByRole('button', { name: /054-381-2290/ }));
    await fireEvent.press(await screen.findByRole('button', { name: 'וואטסאפ' }));
    expect(mockOpenURL).toHaveBeenLastCalledWith('https://wa.me/972543812290');
  });

  it('the Instagram chip opens the profile', async () => {
    serve();
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: /@maya\.lines/ }));
    expect(mockOpenURL).toHaveBeenCalledWith('https://instagram.com/maya.lines');
  });

  it('shows an error toast when a link cannot open', async () => {
    serve();
    mockOpenURL.mockRejectedValue(new Error('no handler'));
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: /@maya\.lines/ }));
    expect(await screen.findByText(LINK_FAILED_MESSAGE)).toBeOnTheScreen();
  });
});

// ---- AC4: summary -------------------------------------------------------------------------------

describe('summary', () => {
  it('shows the tiles and the next appointment, empty until the later epics', async () => {
    serve();
    await renderCard();

    expect(await screen.findByText('קעקועים שבוצעו')).toBeOnTheScreen();
    expect(screen.getByText('הכנסות לפי תורים שהסתיימו')).toBeOnTheScreen();
    expect(screen.getByText(/0 ₪/)).toBeOnTheScreen();
    expect(screen.getByText('אין תור קרוב')).toBeOnTheScreen();
    expect(calls('GET')).toContain(`/clients/${maya.id}/summary`);
  });
});

// ---- AC5: tabs ----------------------------------------------------------------------------------

describe('tabs', () => {
  it('starts on קעקועים and switches to the quotes and notes tabs', async () => {
    serve();
    await renderCard();

    expect(screen.getByRole('tab', { name: 'קעקועים' })).toBeSelected();
    expect(screen.getByText('עדיין אין קעקועים')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'הצעות מחיר' }));
    expect(screen.getByText('עדיין אין הצעות מחיר')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'הערות' }));
    expect(screen.getByText('מעדיפה קו דק')).toBeOnTheScreen();
  });

  it('shows "אין הערות" when the client has no notes', async () => {
    serve();
    await render(<ClientCard id={noa.id} onGone={onGone} />, { wrapper: Providers });
    await screen.findByRole('header', { name: 'נועה ברק' });

    await fireEvent.press(screen.getByRole('tab', { name: 'הערות' }));
    expect(screen.getByText('אין הערות')).toBeOnTheScreen();
  });
});

// ---- AC6: edit ----------------------------------------------------------------------------------

describe('edit', () => {
  it('"עריכת פרטים" opens the edit modal prefilled', async () => {
    serve();
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: 'עריכת פרטים' }));
    expect(await screen.findByRole('header', { name: 'עריכת לקוח' })).toBeOnTheScreen();
    expect(screen.getByLabelText('שם')).toHaveDisplayValue('מאיה לוי');
  });
});

// ---- AC7: delete --------------------------------------------------------------------------------

describe('delete', () => {
  it('confirms, DELETEs, shows the toast and leaves the card', async () => {
    serve();
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: 'עוד פעולות' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'מחיקת לקוח' }));
    expect(await screen.findByRole('header', { name: 'למחוק את מאיה לוי?' })).toBeOnTheScreen();
    expect(screen.getByText('הלקוח יוסר מהרשימה ומהחיפוש.')).toBeOnTheScreen();
    expect(calls('DELETE')).toHaveLength(0);

    await fireEvent.press(screen.getByRole('button', { name: 'מחיקה' }));

    await waitFor(() => expect(calls('DELETE')).toEqual([`/clients/${maya.id}`]));
    expect(await screen.findByText(CLIENT_DELETED_MESSAGE)).toBeOnTheScreen();
    await waitFor(() => expect(onGone).toHaveBeenCalled());
  });

  it('"ביטול" keeps the client', async () => {
    serve();
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: 'עוד פעולות' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'מחיקת לקוח' }));
    await screen.findByRole('header', { name: 'למחוק את מאיה לוי?' });
    await fireEvent.press(screen.getByRole('button', { name: 'ביטול' }));

    expect(calls('DELETE')).toHaveLength(0);
    expect(onGone).not.toHaveBeenCalled();
  });

  it('offline: shows an error toast and stays on the card (nothing queued)', async () => {
    serve({ del: () => Promise.reject(new TypeError('Network request failed')) });
    await renderCard();

    await fireEvent.press(screen.getByRole('button', { name: 'עוד פעולות' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'מחיקת לקוח' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'מחיקה' }));

    expect(await screen.findByText(OFFLINE_DELETE_MESSAGE)).toBeOnTheScreen();
    expect(onGone).not.toHaveBeenCalled();
    expect(calls('DELETE')).toHaveLength(1);
  });
});

// ---- AC8: deleted elsewhere ---------------------------------------------------------------------

describe('not found', () => {
  it('shows "הלקוח לא נמצא" with a way back to the list', async () => {
    serve({ clients: [noa] });
    await render(<ClientCard id={maya.id} onGone={onGone} />, { wrapper: Providers });

    expect(await screen.findByText('הלקוח לא נמצא')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'חזרה לרשימה' }));
    expect(onGone).toHaveBeenCalled();
  });

  it('in the iPad pane, clears itself', async () => {
    serve({ clients: [noa] });
    await render(<ClientCard id={maya.id} onGone={onGone} pane />, { wrapper: Providers });

    await waitFor(() => expect(onGone).toHaveBeenCalled());
  });
});

// ---- AC1: opening the card ----------------------------------------------------------------------

describe('iPhone', () => {
  it('a list row opens the card route', async () => {
    serve();
    await render(<ClientsTab />, { wrapper: Providers });

    await fireEvent.press(await screen.findByText('מאיה לוי'));

    expect(mockRouter.push).toHaveBeenCalledWith(`/clients/${maya.id}`);
    expect(screen.queryByRole('header', { name: 'עריכת לקוח' })).not.toBeOnTheScreen();
  });

  it('the route shows the card and goes back after a delete', async () => {
    serve();
    mockParams = { id: maya.id };
    await render(<ClientRoute />, { wrapper: Providers });
    await screen.findByRole('header', { name: 'מאיה לוי' });

    await fireEvent.press(screen.getByRole('button', { name: 'עוד פעולות' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'מחיקת לקוח' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'מחיקה' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });
});

describe('iPad split', () => {
  it('shows the list and the card side by side, with an empty pane until a row is chosen', async () => {
    setWidth(1180, 820);
    serve();
    await render(<ClientsTab />, { wrapper: Providers });

    expect(await screen.findByText('בחרו לקוח מהרשימה')).toBeOnTheScreen();

    await fireEvent.press(await screen.findByText('נועה ברק'));

    expect(await screen.findByRole('header', { name: 'נועה ברק' })).toBeOnTheScreen();
    expect(screen.queryByText('בחרו לקוח מהרשימה')).not.toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
