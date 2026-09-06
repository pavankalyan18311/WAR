import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

// Mock Supabase client
const mockSignUp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      verifyOtp: mockVerifyOtp,
      resend: mockResend,
      signOut: mockSignOut,
    },
  }),
}));

describe('Auth Store - Supabase Email OTP Flow', () => {
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

  it('defaults to register stage for onboarding', () => {
    expect(useAuthStore.getState().flowStage).toBe('register');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('submits registration to Supabase auth.signUp and updates stage to email_otp', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: null });

    const registrationData = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      dob: '1995-01-01',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    await useAuthStore.getState().submitRegistration(registrationData);

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'Password123!',
      options: {
        data: {
          first_name: 'Jane',
          last_name: 'Doe',
          phone: '',
          dob: '1995-01-01',
        },
      },
    });

    expect(useAuthStore.getState().flowStage).toBe('email_otp');
    expect(useAuthStore.getState().pendingRegistration?.email).toBe('jane@example.com');
  });

  it('verifies Email OTP using Supabase auth.verifyOtp and authenticates user', async () => {
    useAuthStore.setState({
      pendingRegistration: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        dob: '1995-01-01',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
    });

    const mockUser = { id: 'user-123', email: 'jane@example.com' };
    const mockSession = { access_token: 'token-123', user: mockUser };

    mockVerifyOtp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    await useAuthStore.getState().verifyEmailOtp('123456');

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      token: '123456',
      type: 'signup',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().flowStage).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('resends Email OTP using Supabase auth.resend', async () => {
    useAuthStore.setState({
      pendingRegistration: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        dob: '',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
    });

    mockResend.mockResolvedValue({ error: null });

    await useAuthStore.getState().requestEmailOtp();

    expect(mockResend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'jane@example.com',
    });
  });
});