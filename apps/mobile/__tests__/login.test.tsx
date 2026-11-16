// covers AC10, T2, T13 — Login screen: Hebrew fields, disabled/loading/error states.
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { AuthError } from '@/auth/authApi';
import type { AuthState } from '@/auth/AuthProvider';

const mockSignIn = jest.fn<AuthState['signIn']>();
jest.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({ status: 'signedOut', signIn: mockSignIn, signOut: jest.fn(), sessionExpired: jest.fn() }),
}));

import Login from '../app/login';

beforeEach(() => {
  mockSignIn.mockReset();
});

async function fillAndSubmit(email = 'aya@example.com', password = 'pw') {
  await fireEvent.changeText(screen.getByLabelText('אימייל'), email);
  await fireEvent.changeText(screen.getByLabelText('סיסמה'), password);
  await fireEvent.press(screen.getByRole('button', { name: 'כניסה' }));
}

describe('Login screen', () => {
  it('shows email and password fields and a sign-in button', async () => {
    await render(<Login />);
    expect(screen.getByLabelText('אימייל')).toBeOnTheScreen();
    expect(screen.getByLabelText('סיסמה')).toHaveProp('secureTextEntry', true);
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeOnTheScreen();
  });

  it('disables the button until both fields are filled', async () => {
    await render(<Login />);
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('אימייל'), 'aya@example.com');
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('סיסמה'), 'pw');
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeEnabled();
  });

  it('calls signIn with the entered credentials', async () => {
    mockSignIn.mockResolvedValue(undefined);
    await render(<Login />);
    await fillAndSubmit('aya@example.com', 'secret');
    expect(mockSignIn).toHaveBeenCalledWith('aya@example.com', 'secret');
  });

  it('is busy and disabled while signing in', async () => {
    let finish: () => void = () => {};
    mockSignIn.mockImplementation(() => new Promise<void>((r) => (finish = r)));
    await render(<Login />);
    await fillAndSubmit();

    const button = screen.getByRole('button', { name: 'כניסה' });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();

    await act(async () => finish());
  });

  it.each([
    ['invalid_credentials', 'אימייל או סיסמה שגויים'],
    ['rate_limited', 'יותר מדי ניסיונות. אפשר לנסות שוב מאוחר יותר'],
    ['network', 'אין חיבור לשרת. אפשר לנסות שוב'],
    ['unknown', 'משהו השתבש. אפשר לנסות שוב'],
  ] as const)('shows the %s error message', async (code, message) => {
    mockSignIn.mockRejectedValue(new AuthError(code));
    await render(<Login />);
    await fillAndSubmit();
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeEnabled();
  });
});
