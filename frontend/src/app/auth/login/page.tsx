'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      // Surface friendly messages for common Supabase errors
      if (msg.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = 'relative flex items-center';
  const inputBase = 'w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none transition-all';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm mx-auto mb-3"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            TX
          </div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--fg)' }}>THREADX</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>Email</label>
              <div className={inputWrap}>
                <Mail size={15} className="absolute left-3.5 pointer-events-none" style={{ color: 'var(--fg-subtle)' }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  className={inputBase}
                  style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ring)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>Password</label>
                <Link href="/auth/forgot-password"
                  className="text-xs font-semibold hover:opacity-70" style={{ color: 'var(--accent)' }}>
                  Forgot password?
                </Link>
              </div>
              <div className={inputWrap}>
                <Lock size={15} className="absolute left-3.5 pointer-events-none" style={{ color: 'var(--fg-subtle)' }} />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className={inputBase}
                  style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ring)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <button type="button" onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3.5" style={{ color: 'var(--fg-subtle)' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--fg-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-bold hover:opacity-70" style={{ color: 'var(--accent)' }}>
            Create one
          </Link>
        </p>

        <p className="text-center text-[11px] mt-6 px-4" style={{ color: 'var(--fg-subtle)' }}>
          Demo: <strong style={{ color: 'var(--fg-muted)' }}>demo@threadx.in</strong> / <strong style={{ color: 'var(--fg-muted)' }}>password123</strong>
        </p>
      </div>
    </div>
  );
}
