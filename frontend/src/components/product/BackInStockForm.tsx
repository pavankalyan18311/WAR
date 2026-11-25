'use client';

import { useState } from 'react';
import { Bell, Check } from 'lucide-react';

/** Shown instead of "Add to cart" when the chosen size is sold out. */
export default function BackInStockForm({ variantId, size, defaultEmail = '' }: { variantId: string; size?: string | null; defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('saving');
    setError('');
    try {
      const res = await fetch('/api/stock-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save your request.');
      setState('done');
    } catch (err: any) {
      setError(err.message);
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <p className="flex items-start gap-2 text-sm py-3 border-y" style={{ borderColor: 'var(--border-strong)', color: 'var(--success)' }}>
        <Check size={16} className="mt-0.5 flex-shrink-0" />
        <span>Done — we&apos;ll email you when size {size ?? 'this'} is back.</span>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex-1">
      <p className="eyebrow mb-2" style={{ color: 'var(--fg)' }}>Sold out in size {size ?? 'this size'} — get notified</p>
      <div className="flex gap-0">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          aria-label="Email for restock alert" autoComplete="email" className="input-field flex-1 !border-r-0" />
        <button type="submit" disabled={state === 'saving'} className="btn-primary !px-5 whitespace-nowrap">
          <Bell size={14} /> {state === 'saving' ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  );
}
