// covers AC14, T2, T15 — My Data opens only after a fresh local authentication.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';

const mockRouter = { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const mockRequireReauth = jest.fn<(...args: unknown[]) => Promise<boolean>>();
jest.mock('@/auth/requireReauth', () => ({ requireReauth: (...args: unknown[]) => mockRequireReauth(...args) }));
jest.mock('@/auth/localAuth', () => ({ authenticateLocally: jest.fn() }));

import MyData from '../app/my-data';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('My Data (placeholder)', () => {
  it('asks for authentication on open and shows the screen after success', async () => {
    mockRequireReauth.mockResolvedValue(true);
    await render(<MyData />);
    expect(await screen.findByText('הנתונים שלי')).toBeOnTheScreen();
    expect(mockRequireReauth).toHaveBeenCalledTimes(1);
  });

  it('shows nothing while the check is pending', async () => {
    mockRequireReauth.mockImplementation(() => new Promise(() => {}));
    await render(<MyData />);
    await waitFor(() => expect(mockRequireReauth).toHaveBeenCalled());
    expect(screen.queryByText('הנתונים שלי')).toBeNull();
  });

  it('goes back without showing the screen when authentication is cancelled or fails', async () => {
    mockRequireReauth.mockResolvedValue(false);
    await render(<MyData />);
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(screen.queryByText('הנתונים שלי')).toBeNull();
  });

  it('goes home when there is nothing to go back to', async () => {
    mockRequireReauth.mockResolvedValue(false);
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<MyData />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('asks again on every open', async () => {
    mockRequireReauth.mockResolvedValue(true);
    const first = await render(<MyData />);
    await screen.findByText('הנתונים שלי');
    await first.unmount();
    await render(<MyData />);
    await screen.findByText('הנתונים שלי');
    expect(mockRequireReauth).toHaveBeenCalledTimes(2);
  });
});
