import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import RegisterPage from '@/app/auth/register/page';
import { useAuthStore } from '@/store/authStore';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Register Page - Email OTP only onboarding', () => {
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

  it('does not show mobile OTP guidance text on initial render', () => {
    render(<RegisterPage />);

    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.queryByText(/mobile otp for registration/i)).not.toBeInTheDocument();
  });

  it('keeps email-otp registration UI even if store flowStage is set to mobile', async () => {
    render(<RegisterPage />);

    await act(async () => {
      useAuthStore.setState({ flowStage: 'mobile' });
    });

    expect(screen.getByText(/first name/i)).toBeInTheDocument();
    expect(screen.queryByText(/^send otp$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument();
  });

  it('shows a resend otp action when the registration otp stage is active', async () => {
    await act(async () => {
      useAuthStore.setState({
        flowStage: 'email_otp',
        pendingRegistration: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', dob: '', password: 'password123' },
      });
    });

    render(<RegisterPage />);

    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();
  });
});
