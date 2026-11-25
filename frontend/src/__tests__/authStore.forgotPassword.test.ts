import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

const mockResetPasswordForEmail = vi.fn();
const mockVerifyOtp = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      verifyOtp: mockVerifyOtp,
      updateUser: mockUpdateUser,
    },
  }),
}));

describe('Auth Store - Forgot Password & Password Reset Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      session: null,
      isAuthenticated: false,
      flowStage: 'register',
      pendingRegistration: null,
      loading: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockFetchOk = () =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

  it('successfully requests password reset OTP via the server route', async () => {
    const fetchSpy = mockFetchOk();

    await useAuthStore.getState().requestPasswordResetOtp('USER@EXAMPLE.COM  ');

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/password-reset', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'send', email: 'user@example.com' }),
    }));
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('surfaces the server error when the email is not registered', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'No registered account found' }), { status: 404 })
    );

    await expect(useAuthStore.getState().requestPasswordResetOtp('nobody@example.com'))
      .rejects.toThrow('No registered account found');
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid or empty email when requesting password reset OTP', async () => {
    await expect(useAuthStore.getState().requestPasswordResetOtp('')).rejects.toThrow(
      'Please enter your email address.'
    );
    await expect(useAuthStore.getState().requestPasswordResetOtp('invalid-email')).rejects.toThrow(
      'Please enter a valid email address.'
    );
  });

  it('verifies OTP and updates password via the server route', async () => {
    const fetchSpy = mockFetchOk();

    await useAuthStore.getState().resetPasswordWithOtp({
      email: 'user@example.com',
      otp: '654321',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth/password-reset', expect.objectContaining({
      body: JSON.stringify({ action: 'verify', email: 'user@example.com', token: '654321', password: 'NewPassword123!' }),
    }));
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('rejects reset if passwords do not match or password is too short', async () => {
    await expect(
      useAuthStore.getState().resetPasswordWithOtp({
        email: 'user@example.com',
        otp: '654321',
        password: 'short',
        confirmPassword: 'short',
      })
    ).rejects.toThrow('New password must be at least 8 characters long.');

    await expect(
      useAuthStore.getState().resetPasswordWithOtp({
        email: 'user@example.com',
        otp: '654321',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
      })
    ).rejects.toThrow('Passwords do not match.');
  });
});
