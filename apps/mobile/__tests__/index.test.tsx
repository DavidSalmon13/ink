// covers AC5, AC8, T10, T15 — placeholder screen shows "Ink" and the API status.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import Index from '../app/index';

const mockFetch = jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

function healthResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe('placeholder screen', () => {
  it('renders the "Ink" title', async () => {
    mockFetch.mockResolvedValue(healthResponse({ status: 'UP' }));
    await render(<Index />);
    expect(screen.getByText('Ink')).toBeOnTheScreen();
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
    await render(<Index />);
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
    await render(<Index />);
    expect(await screen.findByText('API: unreachable')).toBeOnTheScreen();
  });

  it('re-checks when the status is tapped', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await render(<Index />);
    await screen.findByText('API: unreachable');

    mockFetch.mockResolvedValueOnce(healthResponse({ status: 'UP' }));
    await fireEvent.press(screen.getByText('API: unreachable'));
    expect(await screen.findByText('API: connected')).toBeOnTheScreen();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
