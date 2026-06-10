'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const PASSWORD_RULES = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await register(form.name, form.email, form.phone, form.password);
      if (result?.requiresConfirmation) {
        setConfirmationSent(true);
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('already registered')) {
        setError('An account with this email already exists.');
      } else {
        setError(msg);
      }
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Mail size={28} style={{ color: '#22c55e' }} />
          </div>
          <h1 className="text-xl font-bold mb-2">Check your email</h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            We sent a confirmation link to <strong>{form.email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/auth/login" className="inline-block mt-6 text-sm font-medium" style={{ color: 'var(--primary)' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black" style={{ color: 'var(--fg)' }}>THREADX</Link>
          <h1 className="text-xl font-bold mt-4">Create your account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Join ThreadX — Premium Men&apos;s Fashion</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com' },
              { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '9876543210' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                  placeholder={placeholder}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
            ))}

            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--fg-muted)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors pr-12"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {PASSWORD_RULES.map(({ label, test }) => (
                    <div key={label} className="flex items-center gap-1 text-xs">
                      <CheckCircle
                        size={11}
                        style={{ color: test(form.password) ? '#22c55e' : 'var(--border)' }}
                      />
                      <span style={{ color: test(form.password) ? '#22c55e' : 'var(--fg-muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-2 transition-all"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }} />
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--fg-muted)' }}>
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm mt-4" style={{ color: 'var(--fg-muted)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold" style={{ color: 'var(--primary)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
