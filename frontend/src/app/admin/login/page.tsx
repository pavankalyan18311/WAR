'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAdminStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const success = await login(email, password);
      if (success) {
        // Prefer SPA navigation; fallback to full redirect if it doesn't take effect
        router.push('/admin/dashboard');
        setTimeout(() => {
          if (window.location.pathname !== '/admin/dashboard') {
            window.location.href = '/admin/dashboard';
          }
        }, 300);
      } else {
        setError('Invalid admin credentials. Please try again.');
      }
    } catch (err) {
      set({ isLoading: false });
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-2xl font-black"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              TX
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-widest uppercase mb-1"
              style={{ color: 'var(--fg-muted)' }}>
              <ShieldCheck size={14} />
              Admin Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
              Sign in to the ThreadX admin panel
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Dev auth banner removed - bypass still active for dev if enabled */}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@threadx.in"
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all pr-11"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2"
              style={{
                background: isLoading ? 'var(--border)' : 'var(--primary)',
                color: 'var(--primary-fg)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }}
                  />
                  Signing in…
                </span>
              ) : (
                'Sign In to Admin Panel'
              )}
            </button>
            {handlerCalled && (
              <div className="mt-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
                Handler invoked — processing login…
              </div>
            )}
          </form>

          {/* Demo credentials */}
          <div
            className="mt-6 rounded-xl px-4 py-3 text-sm space-y-1"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <p className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
              Demo Credentials
            </p>
            <p style={{ color: 'var(--fg-muted)' }}>
              <strong style={{ color: 'var(--fg)' }}>Super Admin:</strong> admin@threadx.in / admin123
            </p>
            <p style={{ color: 'var(--fg-muted)' }}>
              <strong style={{ color: 'var(--fg)' }}>Manager:</strong> manager@threadx.in / manager123
            </p>
          </div>

          {/* Back link */}
          <div className="text-center mt-5">
            <a
              href="/"
              className="text-sm transition-colors"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
            >
              ← Back to storefront
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
