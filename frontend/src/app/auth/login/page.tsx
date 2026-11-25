'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AuthShell, { FieldLabel, FormNotice } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, isAuthenticated, role, user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goHome = (userRole: string) =>
    router.push(['admin', 'super_admin', 'manager'].includes(userRole) ? '/admin/dashboard' : '/account/profile');

  // Visitors who are already signed in when they open this page.
  // (While submitting, the auth event fires before the role is loaded, so the handler redirects instead.)
  useEffect(() => {
    if (!submitting && isAuthenticated && user) goHome(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      goHome(result.role);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Sign in with email and password to track orders, save your wishlist and check out faster."
      footer={
        <>
          New here?{' '}
          <Link href="/auth/register" className="ui-link">
            Register with Email OTP
          </Link>
        </>
      }
    >
      {error && <FormNotice>{error}</FormNotice>}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <FieldLabel htmlFor="login-email">Email address</FieldLabel>
          <input id="login-email" data-testid="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required placeholder="you@example.com" autoComplete="email" className="ui-input" />
        </div>

        <div>
          <FieldLabel htmlFor="login-password"
            aside={<Link href="/auth/forgot-password" className="ui-link text-xs">Forgot password?</Link>}>
            Password
          </FieldLabel>
          <div className="relative">
            <input id="login-password" data-testid="auth-password" type={showPw ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              required placeholder="••••••••" autoComplete="current-password" className="ui-input !pr-11" />
            <button type="button" onClick={() => setShowPw((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: 'var(--fg-subtle)' }}
              aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="ui-btn w-full !py-4">
          {loading ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
}
