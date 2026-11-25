'use client';

import { Sparkles } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

/** "Use my reward points" switch for the checkout summary. 1 point = ₹1; the server re-checks everything. */
export default function RewardPointsToggle({ balance, applied, checked, onChange }: {
  balance: number;
  /** Points that will actually be used (capped at the products' value after coupon). */
  applied: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  if (balance <= 0) return null;
  const left = balance - applied;

  return (
    <label className="flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer select-none transition-colors"
      style={{ borderColor: checked ? 'var(--brand)' : 'var(--border)', background: checked ? 'var(--brand-soft)' : 'var(--surface)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        aria-label="Use my reward points" className="mt-0.5 w-4 h-4 cursor-pointer accent-[var(--brand)]" />
      <span className="flex-1 min-w-0">
        <span className="text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
          <Sparkles size={15} style={{ color: 'var(--brand)' }} /> You have <strong>{balance} points</strong>
          <span style={{ color: 'var(--fg-muted)' }}>· worth {formatPrice(balance)}</span>
        </span>
        <span className="block text-[13px] mt-1 font-medium" style={{ color: checked ? 'var(--ok)' : 'var(--fg-muted)' }}>
          {checked
            ? <>−{formatPrice(applied)} applied{left > 0 && <> · {left} points stay in your account</>}</>
            : 'Use them on this order — 1 point = ₹1'}
        </span>
      </span>
    </label>
  );
}
