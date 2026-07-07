'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function ForgotPasswordPage() {
  const { requestPasswordResetOtp, resetPasswordWithOtp } = useAuthStore();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    setBusy(true);
    setError('');
    try {
      await requestPasswordResetOtp(email);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset OTP.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
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
        <h1 className="text-xl font-black" style={{ color: 'var(--fg)' }}>Forgot Password</h1>
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
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
              Password updated successfully. You can now sign in.
            </div>
            <Link href="/auth/login" className="w-full inline-flex items-center justify-center py-3 rounded-xl text-sm font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            {!otpSent ? (
              <button type="button" onClick={sendOtp} disabled={busy || !email}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: busy || !email ? 0.7 : 1 }}>
                {busy ? 'Sending OTP...' : <>Send Email OTP <ArrowRight size={14} /></>}
              </button>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                    Email OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP"
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                  />
                </div>
                <button type="button" onClick={resetPassword} disabled={busy || otp.length !== 6}
                  className="w-full py-3.5 rounded-xl font-bold text-sm"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: busy || otp.length !== 6 ? 0.7 : 1 }}>
                  {busy ? 'Updating password...' : 'Reset Password'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 text-xs flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
          <ShieldCheck size={12} /> Email OTP + hashed password storage for account safety.
        </div>
      </div>
    </div>
  );
}
