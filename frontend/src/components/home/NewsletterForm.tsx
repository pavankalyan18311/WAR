'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not subscribe right now.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-4 py-2" style={{ color: '#F5F2EC' }}>
        <CheckCircle size={22} />
        <div>
          <p className="font-display text-2xl">You&apos;re on the list.</p>
          <p className="text-sm opacity-70">We&apos;ll write when new drops land.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row flex-wrap gap-2 max-w-3xl">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        aria-label="Email address"
        className="flex-1 px-0 py-3.5 text-base outline-none bg-transparent border-b placeholder:text-[rgba(245,242,236,0.45)]"
        style={{ borderColor: 'rgba(245,242,236,0.35)', color: '#F5F2EC' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#F5F2EC')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(245,242,236,0.35)')}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-8 py-3.5 font-semibold text-xs uppercase tracking-[0.18em] whitespace-nowrap disabled:opacity-60 transition-colors hover:bg-[#7A1F1F] hover:text-[#F5F2EC]"
        style={{ background: '#F5F2EC', color: '#161412' }}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
        ) : (
          'Subscribe'
        )}
      </button>
      {error && <p role="alert" className="w-full text-xs font-semibold" style={{ color: '#f87171' }}>{error}</p>}
    </form>
  );
}
