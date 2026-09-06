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

  it('successfully requests password reset OTP', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    await useAuthStore.getState().requestPasswordResetOtp('USER@EXAMPLE.COM  ');

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('rejects invalid or empty email when requesting password reset OTP', async () => {
    await expect(useAuthStore.getState().requestPasswordResetOtp('')).rejects.toThrow(
      'Please enter your email address.'
    );
    await expect(useAuthStore.getState().requestPasswordResetOtp('invalid-email')).rejects.toThrow(
      'Please enter a valid email address.'
    );
  });

  it('successfully verifies OTP and updates password', async () => {
    const mockUser = { id: 'user-777', email: 'user@example.com' };
    const mockSession = { access_token: 'recovery-token', user: mockUser };

    mockVerifyOtp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    mockUpdateUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    await useAuthStore.getState().resetPasswordWithOtp({
      email: 'user@example.com',
      otp: '654321',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    });

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '654321',
      type: 'recovery',
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: 'NewPassword123!',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(mockUser);
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
