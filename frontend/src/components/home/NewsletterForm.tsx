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
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        required
        className="flex-1 px-4 py-3.5 rounded-full text-sm font-medium outline-none"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.25)',
          color: 'var(--primary-fg)',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)')}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-3.5 rounded-full font-bold text-sm whitespace-nowrap disabled:opacity-60 transition-all hover:opacity-90"
        style={{ background: '#fff', color: 'var(--primary)' }}
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
