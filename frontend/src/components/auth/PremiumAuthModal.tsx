'use client';

import { useEffect, useState } from 'react';
import { X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuthPopupStore } from '@/store/authPopupStore';

const SESSION_KEY = 'threadx-auth-popup-shown';
const FALLBACK_MEDIA = '/images/Hero_banner.png';

function canShowInSession(sessionBehavior: 'once-per-session' | 'always') {
  if (sessionBehavior === 'always') return true;
  return sessionStorage.getItem(SESSION_KEY) !== '1';
}

function markShown() {
  sessionStorage.setItem(SESSION_KEY, '1');
}

// Brand UI kit styles (theme tokens, so dark mode follows automatically)
const btn = (disabled: boolean) => `ui-btn w-full !py-3.5 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="px-3.5 py-2.5 text-xs font-medium rounded-xl"
      style={{ color: 'var(--bad)', background: 'var(--bad-soft)' }}>
      {children}
    </div>
  );
}

// ─── Create Account sub-component ───────────────────────────────────────────
function CreateAccountPanel({ onExistingAccount }: { onExistingAccount: (msg: string) => void }) {
  const {
    flowStage,
    pendingRegistration,
    submitRegistration,
    requestEmailOtp,
    verifyEmailOtp,
    resetFlow,
  } = useAuthStore();

  const [emailOtp, setEmailOtp] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', dob: '', password: '', confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Reset store flow when this panel mounts fresh
  useEffect(() => {
    resetFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      if (msg.includes('Account already exists') || msg.includes('already registered')) {
        onExistingAccount(msg);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const step = flowStage === 'email_otp' ? 2 : 1;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <ol className="flex gap-2">
        {(['Details', 'Email OTP'] as const).map((label, i) => {
          const n = i + 1;
          const current = n === step;
          const done = n < step;
          return (
            <li key={label} className="flex-1 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: current ? 'var(--brand)' : done ? 'var(--brand-soft)' : 'var(--surface-2)',
                color: current ? 'var(--brand-fg)' : done ? 'var(--brand)' : 'var(--fg-subtle)',
              }}>
              <span className="font-bold">{done ? '✓' : n}</span>{label}
            </li>
          );
        })}
      </ol>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/* Registration form */}
      {flowStage === 'register' && (
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); wrap(async () => { await submitRegistration(form); await requestEmailOtp(); }); }}
          autoComplete="on"
        >
          <div className="grid grid-cols-2 gap-2.5">
            <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="First Name" aria-label="First name" className="ui-input" autoComplete="given-name" />
            <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Last Name" aria-label="Last name" className="ui-input" autoComplete="family-name" />
          </div>
          <input type="email" value={form.email} onChange={set('email')} placeholder="Email Address" aria-label="Email address" className="ui-input" autoComplete="email" />
          <input type="date" value={form.dob} onChange={set('dob')} aria-label="Date of birth" className="ui-input" autoComplete="bday" />
          <input type="password" value={form.password} onChange={set('password')} placeholder="Password" aria-label="Password" className="ui-input" autoComplete="new-password" />
          <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Confirm Password" aria-label="Confirm password" className="ui-input" autoComplete="new-password" />
          <button type="submit" disabled={busy} className={btn(busy)}>
            {busy ? 'Processing…' : <>Continue to Email Verification <ArrowRight size={14} /></>}
          </button>
        </form>
      )}

      {/* Email OTP */}
      {flowStage === 'email_otp' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
            Email OTP sent to <span className="font-semibold" style={{ color: 'var(--fg)' }}>{pendingRegistration?.email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit Email OTP"
            aria-label="Email OTP"
            className="ui-input text-center font-bold !text-xl tracking-[0.4em] placeholder:!text-sm placeholder:tracking-normal"
          />
          <button
            type="button"
            onClick={() => wrap(() => verifyEmailOtp(emailOtp))}
            disabled={busy || emailOtp.length !== 6}
            className={btn(busy || emailOtp.length !== 6)}
          >
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sign In sub-component ───────────────────────────────────────────────────
function SignInPanel({ prefillMessage }: { prefillMessage?: string }) {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(prefillMessage ?? '');

  // Sync prefill message if it changes (e.g. auto-switch)
  useEffect(() => {
    if (prefillMessage) setError(prefillMessage);
  }, [prefillMessage]);

  const handleLogin = async () => {
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleLogin(); }} autoComplete="on">
      {error && <ErrorNote>{error}</ErrorNote>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        aria-label="Email address"
        className="ui-input"
        autoComplete="email"
      />

      <div className="relative">
        <input
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="ui-input !pr-12"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--fg-subtle)' }}
          aria-label={showPw ? 'Hide password' : 'Show password'}
        >
          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      <div className="flex justify-end">
        <Link href="/auth/forgot-password" className="ui-link text-xs">
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={busy || !email || !password} className={btn(busy || !email || !password)}>
        {busy ? 'Signing in…' : <>Sign In <ArrowRight size={14} /></>}
      </button>
    </form>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────
export default function PremiumAuthModal() {
  const { config } = useAuthPopupStore();
  const { isAuthenticated, resetFlow } = useAuthStore();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'create' | 'signin'>('create');
  // Message passed to Sign In tab when auto-switched due to existing account
  const [autoSwitchMsg, setAutoSwitchMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated || !config.enabled) {
      setOpen(false);
      return;
    }
    if (!canShowInSession(config.sessionBehavior)) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      markShown();
    }, Math.max(0, config.delayMs));

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, config.enabled, config.delayMs, config.sessionBehavior]);

  useEffect(() => {
    if (isAuthenticated) setOpen(false);
  }, [isAuthenticated]);

  const closeModal = () => {
    setOpen(false);
    setAutoSwitchMsg('');
    resetFlow();
  };

  const handleExistingAccount = (msg: string) => {
    resetFlow();
    setAutoSwitchMsg('Account already exists. Please sign in using Email & Password.');
    setTab('signin');
    void msg; // acknowledged
  };

  const switchTab = (t: 'create' | 'signin') => {
    if (t !== tab) {
      resetFlow();
      setAutoSwitchMsg('');
      setTab(t);
    }
  };

  if (!open || isAuthenticated || pathname?.startsWith('/auth')) return null;

  const mediaUrl = config.mediaUrl || FALLBACK_MEDIA;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      style={{ background: 'rgba(22,20,18,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div role="dialog" aria-modal="true" aria-label={config.headline || 'Sign in'}
        className="w-full max-w-4xl overflow-hidden rounded-3xl"
        style={{ background: 'var(--surface)', boxShadow: '0 30px 80px -30px rgba(0,0,0,0.5)' }}>
        <div className="grid md:grid-cols-2" style={{ minHeight: 'min(86vh, 640px)' }}>

          {/* ── Left media panel ── */}
          <div className="relative hidden md:block" style={{ background: 'var(--fg)' }}>
            {config.mediaType === 'video' && config.mediaUrl ? (
              <video src={config.mediaUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- admin-provided URL may be external
              <img src={mediaUrl} alt="WAR — Without Any Regrets" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(243,110,33,0.35) 0%, rgba(22,20,18,0.1) 45%, rgba(22,20,18,0.88) 100%)' }} />
            <div className="absolute inset-x-0 bottom-0 p-8 pointer-events-none text-white">
              <span className="ui-chip mb-3" style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}>WAR — Members</span>
              <p className="ui-heading text-4xl leading-[0.98]">
                Without Any <span style={{ color: '#FF8A45' }}>Regrets.</span>
              </p>
              <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Early access to drops, order tracking &amp; reward points.</p>
            </div>
          </div>

          {/* ── Right auth panel ── */}
          <div className="relative flex flex-col p-6 sm:p-8 md:p-10 overflow-y-auto" style={{ maxHeight: 'min(86vh, 640px)' }}>
            <button type="button" onClick={closeModal} className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ color: 'var(--fg)', background: 'var(--surface-2)' }} aria-label="Close">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-6 pr-8">
              <span className="ui-chip ui-chip-brand mb-3">Join the club</span>
              <h3 className="ui-heading text-3xl leading-[1.05]">{config.headline}</h3>
              {config.description && <p className="mt-2 text-sm" style={{ color: 'var(--fg-muted)' }}>{config.description}</p>}
            </div>

            {/* ── Tabs ── */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl mb-6" style={{ background: 'var(--surface-2)' }} role="tablist">
              {(['create', 'signin'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => switchTab(t)}
                  className="py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: tab === t ? 'var(--surface)' : 'transparent', color: tab === t ? 'var(--fg)' : 'var(--fg-muted)', boxShadow: tab === t ? '0 2px 8px -4px rgba(0,0,0,0.25)' : 'none' }}
                >
                  {t === 'create' ? 'Create Account' : 'Sign In'}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            {tab === 'create' && <CreateAccountPanel onExistingAccount={handleExistingAccount} />}
            {tab === 'signin' && <SignInPanel prefillMessage={autoSwitchMsg} />}

            {/* Footer */}
            <p className="mt-6 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              By continuing you agree to our{' '}
              <Link href="/terms-of-service" onClick={closeModal} className="underline">Terms</Link> &amp;{' '}
              <Link href="/privacy-policy" onClick={closeModal} className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
