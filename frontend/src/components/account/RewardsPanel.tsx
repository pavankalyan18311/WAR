'use client';

import { useEffect, useState } from 'react';
import { Clock, Gift, Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface RewardsData {
  balance: number;
  expiringSoon: { points: number; date: string } | null;
  history: { id: string; label: string; points: number; date: string; expires_at: string | null }[];
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Profile: reward points balance, expiry warning, rules and history. */
export default function RewardsPanel() {
  const [data, setData] = useState<RewardsData | null>(null);

  useEffect(() => {
    fetch('/api/rewards')
      .then((r) => (r.ok ? r.json() : { balance: 0, expiringSoon: null, history: [] }))
      .then(setData)
      .catch(() => setData({ balance: 0, expiringSoon: null, history: [] }));
  }, []);

  if (!data) return <div className="h-28 skeleton rounded-2xl" />;

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--brand-soft)' }}>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--brand)' }}>
            <Gift size={16} /> Your points
          </p>
          <p className="ui-heading text-5xl sm:text-6xl leading-none" style={{ color: 'var(--brand)' }}>{data.balance}</p>
          <p className="text-[15px] mt-3 font-medium" style={{ color: 'var(--fg)' }}>Worth {formatPrice(data.balance)} on your next order</p>
          {data.expiringSoon && (
            <p className="text-sm mt-3 font-semibold flex items-start gap-1.5 rounded-xl px-3 py-2" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
              <Clock size={15} className="mt-0.5 flex-shrink-0" />
              <span>{data.expiringSoon.points} points expire on {fmt(data.expiringSoon.date)} — use them soon.</span>
            </p>
          )}
        </div>
        <div className="ui-card-soft p-5 sm:p-6 text-sm space-y-2.5" style={{ color: 'var(--fg-muted)' }}>
          <p className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
            <Sparkles size={16} style={{ color: 'var(--brand)' }} /> How it works
          </p>
          <p>Earn surprise reward points every time your order is <strong style={{ color: 'var(--fg)' }}>delivered</strong>.</p>
          <p>1 point = ₹1. Use any number of points at checkout, together with a coupon.</p>
          <p>Points are valid for 90 days.</p>
        </div>
      </div>

      {data.history.length === 0 ? (
        <p className="mt-5 text-sm" style={{ color: 'var(--fg-muted)' }}>No points yet — they&apos;ll appear here after your first delivered order.</p>
      ) : (
        <ul className="mt-5 ui-card-soft px-4 sm:px-5" aria-label="Points history">
          {data.history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-4 py-3.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{h.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {fmt(h.date)}{h.points > 0 && h.expires_at && <> · valid till {fmt(h.expires_at)}</>}
                </p>
              </div>
              <span className={`ui-chip ${h.points > 0 ? 'ui-chip-ok' : ''} tabular-nums text-sm`}
                style={h.points > 0 ? undefined : { background: 'var(--surface)', color: 'var(--fg-muted)' }}>
                {h.points > 0 ? `+${h.points}` : `−${Math.abs(h.points)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
