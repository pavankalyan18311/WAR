import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

describe('Auth Store - Email OTP first flow', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      sessionToken: null,
      sessionExpiresAt: null,
      flowStage: 'register',
      mobileOtpSent: false,
      emailOtpSent: false,
      mobileWidgetOpen: false,
      mobileWidgetError: '',
      currentMobile: '',
      pendingRegistration: null,
      passwordResetEmail: '',
    });
  });

  it('defaults to register stage for email OTP onboarding', () => {
    expect(useAuthStore.getState().flowStage).toBe('register');
  });

  it('resetFlow returns to register stage', () => {
    useAuthStore.getState().resetFlow();
    expect(useAuthStore.getState().flowStage).toBe('register');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('register does not call mobile OTP request in email-only flow', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const mobileOtpSpy = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ requestMobileOtp: mobileOtpSpy });

    await useAuthStore.getState().register(
      'Jane Doe',
      'jane@example.com',
      '9999999999',
      'password123'
    );

    expect(mobileOtpSpy).not.toHaveBeenCalled();
    expect(useAuthStore.getState().flowStage).toBe('email_otp');
    expect(useAuthStore.getState().emailOtpSent).toBe(true);
  });
});