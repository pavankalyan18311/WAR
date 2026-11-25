'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AuthShell, { FieldLabel, FormNotice } from '@/components/auth/AuthShell';

const STEPS = ['Details', 'Verify email', 'Done'];

export default function RegisterPage() {
  const router = useRouter();
  const {
    flowStage,
    pendingRegistration,
    submitRegistration,
    verifyEmailOtp,
    resetFlow,
    isAuthenticated,
  } = useAuthStore();

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

  const stage = useMemo(() => flowStage, [flowStage]);

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

  const handleSubmitRegistration = () =>
    wrap(async () => {
      if (!form.firstName.trim()) throw new Error('First name is required.');
      if (!form.lastName.trim()) throw new Error('Last name is required.');
      if (!form.email.trim() || !form.email.includes('@')) throw new Error('Valid email address is required.');
      if (form.password.length < 8) throw new Error('Password must be at least 8 characters long.');
      if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.');
      await submitRegistration(form);
      router.push('/auth/verify-email-otp');
    });

  const handleVerifyEmailOtp = () => wrap(async () => {
    await verifyEmailOtp(emailOtp);
    router.push('/');
  });

  const step = ({ register: 1, email_otp: 2, authenticated: 3 } as Record<string, number>)[stage as string] ?? 1;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <AuthShell
      image="/images/full-width-brand.png"
      eyebrow="Join WAR"
      title="Create your account"
      subtitle="We'll send a one-time code to your email to confirm it's you. After that, sign in with your email and password."
      footer={
        <div className="space-y-3">
          <p>
            Already have an account?{' '}
            <Link href="/auth/login" className="ui-link">
              Sign in with Email & Password
            </Link>
          </p>
          <p className="text-xs">
            By creating an account, you agree to our{' '}
            <Link href="/terms-of-service" className="underline">Terms of Service</Link> and{' '}
            <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      }
    >
      {/* Steps */}
      <ol className="flex items-center gap-2 mb-8" aria-label="Registration steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className="flex-1 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold"
              style={{
                background: current ? 'var(--brand)' : done ? 'var(--brand-soft)' : 'var(--surface-2)',
                color: current ? 'var(--brand-fg)' : done ? 'var(--brand)' : 'var(--fg-subtle)',
              }}
              aria-current={current ? 'step' : undefined}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: current ? 'rgba(255,255,255,0.25)' : 'transparent', border: current ? 'none' : '1.5px solid currentColor' }}>
                {done ? '✓' : n}
              </span>
              <span className="truncate">{label}</span>
            </li>
          );
        })}
      </ol>

      {error && <FormNotice>{error}</FormNotice>}

      {stage === 'register' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="reg-first">First name</FieldLabel>
              <input id="reg-first" data-testid="auth-firstname" type="text" autoComplete="given-name"
                value={form.firstName} onChange={set('firstName')} className="ui-input" />
            </div>
            <div>
              <FieldLabel htmlFor="reg-last">Last name</FieldLabel>
              <input id="reg-last" data-testid="auth-lastname" type="text" autoComplete="family-name"
                value={form.lastName} onChange={set('lastName')} className="ui-input" />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="reg-email">Email address</FieldLabel>
            <input id="reg-email" data-testid="auth-email" type="email" autoComplete="email"
              value={form.email} onChange={set('email')} className="ui-input" placeholder="you@example.com" />
          </div>
          <div>
            <FieldLabel htmlFor="reg-dob">Date of birth</FieldLabel>
            <input id="reg-dob" type="date" autoComplete="bday" value={form.dob} onChange={set('dob')} className="ui-input" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="reg-pw">Password</FieldLabel>
              <input id="reg-pw" data-testid="auth-password" type="password" autoComplete="new-password"
                value={form.password} onChange={set('password')} className="ui-input" placeholder="Min 8 characters" />
            </div>
            <div>
              <FieldLabel htmlFor="reg-pw2">Confirm password</FieldLabel>
              <input id="reg-pw2" data-testid="auth-confirm-password" type="password" autoComplete="new-password"
                value={form.confirmPassword} onChange={set('confirmPassword')} className="ui-input" />
            </div>
          </div>
          <button type="button" onClick={handleSubmitRegistration} disabled={busy} className="ui-btn w-full !py-4 mt-2">
            {busy ? 'Preparing email verification...' : <>Verify Email <ArrowRight size={15} /></>}
          </button>
        </div>
      )}

      {stage === 'email_otp' && (
        <div className="space-y-5">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            OTP sent to <strong style={{ color: 'var(--fg)' }}>{pendingRegistration?.email}</strong>
          </p>
          <div>
            <FieldLabel htmlFor="reg-otp">Email OTP</FieldLabel>
            <input id="reg-otp" data-testid="auth-email-otp" type="text" inputMode="numeric" autoComplete="one-time-code"
              value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="ui-input text-center font-bold !text-2xl tracking-[0.5em]" placeholder="••••••" />
          </div>
          <button type="button" onClick={handleVerifyEmailOtp} disabled={busy || emailOtp.length !== 6} className="ui-btn w-full !py-4">
            {busy ? 'Verifying...' : 'Create Account'}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
