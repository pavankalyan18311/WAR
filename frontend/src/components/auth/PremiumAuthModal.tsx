'use client';

import { useEffect, useState } from 'react';
import { X, ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuthPopupStore } from '@/store/authPopupStore';

const SESSION_KEY = 'threadx-auth-popup-shown';

function canShowInSession(sessionBehavior: 'once-per-session' | 'always') {
  if (sessionBehavior === 'always') return true;
  return sessionStorage.getItem(SESSION_KEY) !== '1';
}

function markShown() {
  sessionStorage.setItem(SESSION_KEY, '1');
}

// Shared field style for the dark modal surface
const field =
  'w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-colors placeholder:text-white/40';
const fieldStyle = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.16)',
  color: '#f5f7fa',
};
const btn = (disabled: boolean) =>
  `w-full py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-opacity ${
    disabled ? 'opacity-50 cursor-not-allowed' : ''
  }`;
const btnStyle = { background: '#f5f7fa', color: '#10131b' };
const btnGhost = {
  background: 'rgba(255,255,255,0.09)',
  color: '#f5f7fa',
  border: '1px solid rgba(255,255,255,0.15)',
};

// ─── Create Account sub-component ───────────────────────────────────────────
function CreateAccountPanel({ onExistingAccount }: { onExistingAccount: (msg: string) => void }) {
  const {
    flowStage,
    mobileWidgetError,
    pendingRegistration,
    submitRegistration,
    requestEmailOtp,
    verifyEmailOtp,
    resetFlow,
  } = useAuthStore();

  // Surface widget errors (existing account, cancellation, etc.)
  useEffect(() => {
    if (mobileWidgetError) setError(mobileWidgetError);
  }, [mobileWidgetError]);

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

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {(['Details', 'Email OTP'] as const).map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={label} className="flex items-center gap-1.5 flex-1">
              <div className="flex flex-col items-center gap-0.5 flex-1">
                <div
                  className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{
                    background: done ? 'rgba(34,197,94,0.85)' : active ? '#f5f7fa' : 'rgba(255,255,255,0.12)',
                    color: active ? '#10131b' : done ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {done ? '✓' : n}
                </div>
                <span className="text-[9px] font-semibold" style={{ color: active ? '#f5f7fa' : 'rgba(255,255,255,0.4)' }}>
                  {label}
                </span>
              </div>
              {i < 1 && <div className="h-px flex-1 -mt-3" style={{ background: 'rgba(255,255,255,0.12)' }} />}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Step 3 — Registration form */}
      {flowStage === 'register' && (
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); wrap(async () => { await submitRegistration(form); await requestEmailOtp(); }); }}
          autoComplete="on"
        >
          <div className="grid grid-cols-2 gap-2.5">
            <input type="text" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First Name" className={field} style={fieldStyle} autoComplete="given-name" />
            <input type="text" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last Name" className={field} style={fieldStyle} autoComplete="family-name" />
          </div>
          <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email Address" className={field} style={fieldStyle} autoComplete="email" />
          <input type="date" value={form.dob} onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))} className={field} style={{ ...fieldStyle, colorScheme: 'dark' }} autoComplete="bday" />
          <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Password" className={field} style={fieldStyle} autoComplete="new-password" />
          <input type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm Password" className={field} style={fieldStyle} autoComplete="new-password" />
          <button
            type="submit"
            disabled={busy}
            className={btn(busy)}
            style={btnStyle}
          >
            {busy ? 'Processing…' : <>Continue to Email Verification <ArrowRight size={14} /></>}
          </button>
        </form>
      )}

      {/* Step 4 — Email OTP */}
      {flowStage === 'email_otp' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Email OTP sent to <span className="font-semibold text-white">{pendingRegistration?.email}</span>
          </p>
          <input
            type="text"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit Email OTP"
            className={field}
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={() => wrap(() => verifyEmailOtp(emailOtp))}
            disabled={busy || emailOtp.length !== 6}
            className={btn(busy || emailOtp.length !== 6)}
            style={btnStyle}
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
      {error && (
        <div className="px-3.5 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className={field}
        style={fieldStyle}
        autoComplete="email"
      />

      <div className="relative">
        <input
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={`${field} pr-12`}
          style={fieldStyle}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
          style={{ color: '#f5f7fa' }}
          aria-label={showPw ? 'Hide password' : 'Show password'}
        >
          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      <div className="flex justify-end">
        <Link href="/auth/forgot-password" className="text-[11px] font-semibold hover:underline" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={busy || !email || !password}
        className={btn(busy || !email || !password)}
        style={btnStyle}
      >
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

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(5,7,12,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl border"
        style={{ borderColor: 'rgba(255,255,255,0.14)' }}
      >
        <div className="grid md:grid-cols-2" style={{ minHeight: 'min(88vh, 680px)' }}>

          {/* ── Left media panel ── */}
          <div className="relative hidden md:block">
            {config.mediaType === 'video' ? (
              <video src={config.mediaUrl} autoPlay muted loop playsInline
                className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <img src={config.mediaUrl} alt="ThreadX campaign"
                className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(7,9,15,0.3), rgba(7,9,15,0.78))' }} />
            <div className="absolute inset-0 p-8 flex flex-col justify-end pointer-events-none">
              <p className="text-[10px] tracking-[0.28em] uppercase font-extrabold text-white/60">Private Luxury Edit</p>
              <h2 className="text-3xl font-black text-white mt-2 leading-snug">Campaign Access<br />for Members Only</h2>
              <p className="text-sm text-white/70 mt-3 leading-relaxed">
                Curated styles, concierge drops, and fit intelligence crafted for modern premium menswear.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <ShieldCheck size={15} className="text-white" />
                </div>
                <span className="text-xs text-white/65">Secure · Private · Hashed</span>
              </div>
            </div>
          </div>

          {/* ── Right auth panel ── */}
          <div
            className="relative flex flex-col p-5 sm:p-7 md:p-8 overflow-y-auto"
            style={{ background: 'linear-gradient(165deg, rgba(20,23,33,0.92), rgba(12,14,22,0.98))', color: '#f5f7fa', maxHeight: 'min(88vh, 680px)' }}
          >
            {/* Close */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 p-2 rounded-full transition hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.07)' }}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold mb-4"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>
                <Sparkles size={11} />
                Premium Authentication
              </div>
              <h3 className="text-2xl font-black leading-snug">{config.headline}</h3>
              <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{config.description}</p>
            </div>

            {/* ── Tabs ── */}
            <div className="flex rounded-xl overflow-hidden mb-5 p-0.5 gap-0.5"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(['create', 'signin'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all"
                  style={
                    tab === t
                      ? { background: '#f5f7fa', color: '#10131b' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.55)' }
                  }
                >
                  {t === 'create' ? 'Create Account' : 'Sign In'}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            {tab === 'create' && (
              <CreateAccountPanel onExistingAccount={handleExistingAccount} />
            )}
            {tab === 'signin' && (
              <SignInPanel prefillMessage={autoSwitchMsg} />
            )}

            {/* Footer */}
            <p className="mt-5 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              By continuing you agree to our{' '}
              <Link href="/terms" onClick={closeModal} className="underline">Terms</Link> &amp;{' '}
              <Link href="/privacy" onClick={closeModal} className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
