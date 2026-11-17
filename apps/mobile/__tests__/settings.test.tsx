// covers owner-auth-lock AC5, AC8, AC15, T10, T15, T16 — the temporary logout and API status, moved from the
// placeholder Home to the Settings placeholder by app-shell T13 (until the Settings epic).
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AuthState } from '@/auth/AuthProvider';

const mockSignOut = jest.fn<AuthState['signOut']>();
jest.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'signedIn', signIn: jest.fn(), signOut: mockSignOut, sessionExpired: jest.fn() }),
}));

import Settings from '../app/(tabs)/settings';

/** expo-router supplies this in the app; screens read the insets. iPhone 393×852 metrics. */
function SafeArea({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 54, left: 0, right: 0, bottom: 34 } }}
    >
      {children}
    </SafeAreaProvider>
  );
}

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  mockFetch.mockReset();
  mockSignOut.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

function healthResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe('settings placeholder', () => {
  it('renders the "הגדרות" title', async () => {
    mockFetch.mockResolvedValue(healthResponse({ status: 'UP' }));
    await render(<Settings />, { wrapper: SafeArea });
    expect(screen.getByRole('header', { name: 'הגדרות' })).toBeOnTheScreen();
    expect(await screen.findByText('API: connected')).toBeOnTheScreen();
  });

  it('shows "checking" until the health call settles', async () => {
    jest.useFakeTimers();
    // A request that only settles when the health check's timeout aborts it.
    mockFetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await render(<Settings />, { wrapper: SafeArea });
    expect(screen.getByTestId('api-status')).toHaveTextContent('API: checking…');

    // Let the timeout fire so no timer or request outlives the test.
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(screen.getByTestId('api-status')).toHaveTextContent('API: unreachable');
    jest.useRealTimers();
  });

  it('shows "unreachable" when fetch fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await render(<Settings />, { wrapper: SafeArea });
    expect(await screen.findByText('API: unreachable')).toBeOnTheScreen();
  });

  it('re-checks when the status is tapped', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await render(<Settings />, { wrapper: SafeArea });
    await screen.findByText('API: unreachable');

    mockFetch.mockResolvedValueOnce(healthResponse({ status: 'UP' }));
    await fireEvent.press(screen.getByText('API: unreachable'));
    expect(await screen.findByText('API: connected')).toBeOnTheScreen();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('logs out from the temporary button (until Settings exists)', async () => {
    mockFetch.mockResolvedValue(healthResponse({ status: 'UP' }));
    mockSignOut.mockResolvedValue(undefined);
    await render(<Settings />, { wrapper: SafeArea });
    await screen.findByText('API: connected');

    await fireEvent.press(screen.getByRole('button', { name: 'התנתקות' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'התנתקות' })).toBeDisabled();
  });
});
