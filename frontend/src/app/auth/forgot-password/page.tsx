'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AuthShell, { FieldLabel, FormNotice } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const { requestPasswordResetOtp, resetPasswordWithOtp } = useAuthStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await requestPasswordResetOtp(email);
      setOtpSent(true);
      setResendTimer(45);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset OTP.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await resetPasswordWithOtp({ email, otp, password, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account help"
      title="Forgot Password"
      subtitle="Reset your password using an email OTP."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/auth/login" className="ui-link">Back to sign in</Link>
        </>
      }
    >
      {error && <FormNotice>{error}</FormNotice>}

      {done ? (
        <div className="space-y-6">
          <FormNotice tone="success">Password updated successfully. You can now sign in with your new password.</FormNotice>
          <Link href="/auth/login" className="ui-btn w-full !py-4">Back to Sign In</Link>
        </div>
      ) : !otpSent ? (
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div>
            <FieldLabel htmlFor="forgot-email">Email address</FieldLabel>
            <input id="forgot-email" data-testid="forgot-email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="ui-input" />
          </div>
          <button type="submit" disabled={busy || !email} className="ui-btn w-full !py-4">
            {busy ? 'Sending OTP...' : <>Send Email OTP <ArrowRight size={14} /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <FieldLabel>Email address</FieldLabel>
            <input type="email" disabled value={email} className="ui-input opacity-60" />
          </div>

          <div>
            <FieldLabel htmlFor="forgot-otp"
              aside={
                <button type="button" onClick={() => handleSendOtp()} disabled={busy || resendTimer > 0}
                  className="text-xs font-bold disabled:opacity-50" style={{ color: 'var(--brand)' }}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              }>
              Email OTP
            </FieldLabel>
            <input id="forgot-otp" data-testid="forgot-otp" type="text" inputMode="numeric" autoComplete="one-time-code"
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP code" className="ui-input text-center font-bold !text-xl tracking-[0.4em] placeholder:!text-sm placeholder:tracking-normal" />
          </div>

          <div>
            <FieldLabel htmlFor="forgot-new-password">New password</FieldLabel>
            <div className="relative">
              <input id="forgot-new-password" data-testid="forgot-new-password" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters" className="ui-input !pr-11" />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--fg-subtle)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="forgot-confirm">Confirm new password</FieldLabel>
            <input id="forgot-confirm" data-testid="forgot-confirm-password" type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password" className="ui-input" />
          </div>

          <button type="submit" disabled={busy || otp.length !== 6 || password.length < 8} className="ui-btn w-full !py-4">
            {busy ? 'Updating password...' : 'Reset Password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
