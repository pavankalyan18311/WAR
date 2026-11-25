'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AuthShell, { FieldLabel, FormNotice } from '@/components/auth/AuthShell';

export default function VerifyEmailPage() {
  const router = useRouter();
  const {
    pendingRegistration,
    verifyEmailOtp,
    requestEmailOtp,
    isAuthenticated,
    loading,
  } = useAuthStore();

  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fullOtp = otpValue.trim();
    if (fullOtp.length < 6 || fullOtp.length > 8) {
      setError('Please enter a valid OTP code.');
      return;
    }

    try {
      await verifyEmailOtp(fullOtp);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed. Please check the code and try again.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setResendMessage('');
    try {
      await requestEmailOtp();
      setResendMessage('A new verification OTP code has been sent to your email.');
      setResendCooldown(45);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const userEmail = pendingRegistration?.email || 'your email';

  return (
    <AuthShell
      image="/images/full-width-brand.png"
      eyebrow="Step 02 — Verify email"
      title="Check your inbox"
      subtitle={<>We&apos;ve sent a verification code to <strong style={{ color: 'var(--fg)' }}>{userEmail}</strong>.</>}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs">Didn&apos;t get it? Check your spam folder.</span>
          <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || resending}
            className="inline-flex items-center gap-1.5 text-sm font-bold disabled:opacity-50"
            style={{ color: 'var(--brand)' }}>
            <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP Code'}
          </button>
        </div>
      }
    >
      {error && <FormNotice>{error}</FormNotice>}
      {resendMessage && <FormNotice tone="success">{resendMessage}</FormNotice>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <FieldLabel htmlFor="verify-otp">Verification code</FieldLabel>
          <input id="verify-otp" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus
            placeholder="Enter OTP code" value={otpValue} onChange={handleInputChange}
            className="ui-input text-center font-bold !text-3xl !py-4 tracking-[0.45em] placeholder:!text-base placeholder:tracking-normal" />
        </div>

        <button type="submit" disabled={loading || otpValue.length < 6} className="ui-btn w-full !py-4">
          {loading ? 'Verifying Code...' : <>Complete Verification <ArrowRight size={15} /></>}
        </button>
      </form>
    </AuthShell>
  );
}
