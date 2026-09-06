'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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
    const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 8);
    setOtpValue(cleanDigits);
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black" style={{ color: 'var(--fg)' }}>
            THREADX
          </Link>
          <div className="w-14 h-14 rounded-2xl mx-auto my-4 flex items-center justify-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Mail size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
            We've sent an OTP verification code to:
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--fg)' }}>
            {userEmail}
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm mb-6"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {resendMessage && (
            <div className="rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2"
              style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle2 size={16} />
              {resendMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block text-center mb-3" style={{ color: 'var(--fg-muted)' }}>
                Enter OTP Verification Code
              </label>

              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  placeholder="Enter OTP code"
                  value={otpValue}
                  onChange={handleInputChange}
                  className="w-full text-center text-2xl font-bold tracking-[0.4em] py-3.5 rounded-xl outline-none transition-all"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: otpValue ? '2px solid var(--primary)' : '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpValue.length < 6}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-fg)',
                opacity: loading || otpValue.length < 6 ? 0.6 : 1,
              }}
            >
              {loading ? 'Verifying Code...' : <>Complete Verification <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-4 flex flex-col items-center gap-3 text-sm" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
              Didn't receive the code? Check spam folder or resend.
            </p>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="font-semibold text-xs flex items-center gap-1.5 hover:underline disabled:opacity-50"
              style={{ color: 'var(--primary)' }}
            >
              <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP Code'}
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--fg-subtle)' }}>
            <ShieldCheck size={13} /> Secured by Supabase Native Authentication
          </div>
        </div>
      </div>
    </div>
  );
}