'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-black" style={{ color: 'var(--fg)' }}>Forgot Password</h1>
          <Link href="/auth/login" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--fg-muted)' }}>
            <ArrowLeft size={12} /> Back
          </Link>
        </div>

        <p className="text-sm mt-1 mb-5" style={{ color: 'var(--fg-muted)' }}>
          Reset your password using an email OTP.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        {done ? (
          <div className="space-y-4">
            <div className="px-4 py-3.5 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
              Password updated successfully. You can now sign in with your new password.
            </div>
            <Link href="/auth/login" className="w-full inline-flex items-center justify-center py-3.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Back to Sign In
            </Link>
          </div>
        ) : !otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                Email Address
              </label>
              <input
                data-testid="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <button type="submit" disabled={busy || !email}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: busy || !email ? 0.7 : 1 }}>
              {busy ? 'Sending OTP...' : <>Send Email OTP <ArrowRight size={14} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none opacity-70"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                  Email OTP
                </label>
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={busy || resendTimer > 0}
                  className="text-xs font-semibold hover:underline disabled:opacity-50"
                  style={{ color: 'var(--accent)' }}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
              <input
                data-testid="forgot-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit OTP code"
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none tracking-widest font-mono text-center"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                New Password
              </label>
              <div className="relative">
                <input
                  data-testid="forgot-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-3 pr-10 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                Confirm New Password
              </label>
              <input
                data-testid="forgot-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <button type="submit" disabled={busy || otp.length !== 6 || password.length < 8}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: busy || otp.length !== 6 || password.length < 8 ? 0.7 : 1 }}>
              {busy ? 'Updating password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 text-xs flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
          <ShieldCheck size={12} /> Email OTP + hashed password storage for account safety.
        </div>
      </div>
    </div>
  );
}
