import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import RegisterPage from '@/app/auth/register/page';
import VerifyEmailPage from '@/app/auth/verify-email-otp/page';
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
      session: null,
      flowStage: 'register',
      pendingRegistration: null,
    });
  });

  it('does not show mobile OTP guidance text on initial render', () => {
    render(<RegisterPage />);

    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.queryByText(/mobile otp for registration/i)).not.toBeInTheDocument();
  });

  it('shows the email registration form without any mobile number field', () => {
    render(<RegisterPage />);

    expect(screen.getByText(/first name/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-email')).toBeInTheDocument();
    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument();
  });

  it('verify page offers a resend OTP action and shows the WAR brand', async () => {
    await act(async () => {
      useAuthStore.setState({
        flowStage: 'email_otp',
        pendingRegistration: {
          firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
          dob: '', password: 'password123', confirmPassword: 'password123',
        },
      });
    });

    render(<VerifyEmailPage />);

    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WAR' })).toBeInTheDocument();
    expect(screen.queryByText(/threadx/i)).not.toBeInTheDocument();
  });
});
