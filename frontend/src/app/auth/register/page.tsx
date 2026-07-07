'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const {
    flowStage,
    mobileWidgetError,
    pendingRegistration,
    submitRegistration,
    requestEmailOtp,
    verifyEmailOtp,
    resetFlow,
    isAuthenticated,
  } = useAuthStore();

  // Surface widget-level errors (account exists, cancelled, etc.)
  useEffect(() => {
    if (mobileWidgetError) setError(mobileWidgetError);
  }, [mobileWidgetError]);

  const [emailOtp, setEmailOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    resetFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const stage = useMemo(() => {
    if (flowStage === 'email_otp') return 'email_otp';
    return 'register';
  }, [flowStage]);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitRegistration = () => wrap(async () => {
    await submitRegistration(form);
    await requestEmailOtp();
  });

  const handleVerifyEmailOtp = () => wrap(async () => {
    await verifyEmailOtp(emailOtp);
    router.push('/');
  });

  const inputCls = 'w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors';
  const inputStyle = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };

  const step = {
    register: 2,
    email_otp: 3,
    authenticated: 3,
  }[stage as string] ?? 2;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black" style={{ color: 'var(--fg)' }}>THREADX</Link>
          <h1 className="text-xl font-bold mt-4">Create your account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Verify your email with OTP to create an account, then login with email and password</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => {
            const done = n < step;
            const active = n === step;
            return (
              <div key={n} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center"
                  style={{
                    background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: done || active ? 'var(--primary-fg)' : 'var(--fg-subtle)',
                  }}>
                  {done ? <CheckCircle2 size={12} /> : n}
                </div>
                {n < 3 && <div className="w-6 h-px" style={{ background: 'var(--border)' }} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {stage === 'register' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>First Name</label>
                    <input data-testid="auth-firstname" type="text" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Last Name</label>
                  <input data-testid="auth-lastname" type="text" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Email Address</label>
                <input data-testid="auth-email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Date of Birth</label>
                <input type="date" value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Password</label>
                <input data-testid="auth-password" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Confirm Password</label>
                <input data-testid="auth-confirm-password" type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <button type="button" onClick={handleSubmitRegistration} disabled={busy}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Preparing email verification...' : <>Verify Email <ArrowRight size={16} /></>}
              </button>
            </div>
          )}

          {stage === 'email_otp' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>OTP sent to {pendingRegistration?.email}</p>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Email OTP</label>
                <input data-testid="auth-email-otp" type="text" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={inputCls} style={inputStyle} placeholder="6-digit OTP" />
              </div>
              <button type="button" onClick={handleVerifyEmailOtp} disabled={busy || emailOtp.length !== 6}
                className="w-full py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: busy || emailOtp.length !== 6 ? 0.7 : 1 }}>
                {busy ? 'Verifying...' : 'Create Account'}
              </button>
            </div>
          )}

          <div className="mt-5 pt-4 flex items-center gap-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
            <ShieldCheck size={13} /> Passwords are stored as secure hashes and sessions use JWT-style tokens.
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--fg-muted)' }}>
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm mt-4" style={{ color: 'var(--fg-muted)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold" style={{ color: 'var(--primary)' }}>
              Sign in with Email & Password
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
