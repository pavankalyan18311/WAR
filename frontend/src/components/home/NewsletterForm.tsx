'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          <CheckCircle size={22} style={{ color: 'var(--primary-fg)' }} />
        </div>
        <div>
          <p className="font-black text-lg" style={{ color: 'var(--primary-fg)' }}>You&apos;re in!</p>
          <p className="text-sm opacity-70" style={{ color: 'var(--primary-fg)' }}>Check your inbox for your 10% off code.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-3xl">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="flex-1 px-4 py-3.5 text-sm font-medium outline-none"
        style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#ffffff',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.38)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-8 py-3.5 font-black text-sm uppercase tracking-[0.05em] whitespace-nowrap disabled:opacity-60 transition-all hover:opacity-90"
        style={{ background: '#fff', color: '#111' }}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
        ) : (
          'Subscribe'
        )}
      </button>
    </form>
  );
}
