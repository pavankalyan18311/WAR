'use client';

import { useEffect, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

type DiscountType = 'percentage' | 'flat' | 'free_shipping';

interface AvailableCoupon {
  code: string;
  title: string;
  desc: string;
  expires: string;
  discount_type: DiscountType;
  min_order_amount?: number;
}

/**
 * Checkout coupon box: the customer's available coupons (tap to apply), a field to type a code,
 * and the applied coupon with a remove option. Validation always happens on the server.
 */
export default function CouponPicker({ subtotal, appliedCode, onApply, onRemove }: {
  subtotal: number;
  appliedCode: string;
  onApply: (code: string, discount: number, type: DiscountType) => void;
  onRemove: () => void;
}) {
  const [coupons, setCoupons] = useState<AvailableCoupon[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/coupons')
      .then((r) => (r.ok ? r.json() : { coupons: [] }))
      .then((d) => setCoupons(d.coupons ?? []))
      .catch(() => setCoupons([]));
  }, []);

  const apply = async (raw: string) => {
    const c = raw.toUpperCase().trim();
    if (!c) return;
    setBusy(c);
    setError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, subtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.valid) {
        onApply(data.coupon.code, data.discount, data.coupon.discount_type);
        setCode('');
      } else {
        setError(data.error || 'This coupon code is not valid.');
      }
    } catch {
      setError('Could not check the coupon. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3" style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)' }}>
        <p className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--ok)' }}>
          <Tag size={15} /> <span className="font-bold tracking-wide">{appliedCode}</span> applied
        </p>
        <button type="button" onClick={onRemove} aria-label="Remove coupon" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--surface)]" style={{ color: 'var(--fg-muted)' }}>
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[15px] font-bold mb-2.5 inline-flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <Tag size={16} style={{ color: 'var(--brand)' }} /> Have a coupon?
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); apply(code); }}>
        <input aria-label="Coupon code" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="Enter coupon code" className="ui-input flex-1 !py-2.5 uppercase tracking-wide text-sm" />
        <button type="submit" disabled={!code.trim() || !!busy} aria-label="Apply code"
          className="ui-btn-ghost !px-4 !py-2.5 whitespace-nowrap disabled:opacity-50">
          {busy === code.toUpperCase().trim() ? '…' : 'Apply'}
        </button>
      </form>
      {error && <p role="alert" className="text-[13px] mt-2" style={{ color: 'var(--bad)' }}>{error}</p>}

      {coupons.length > 0 && (
        <ul className="mt-3.5 space-y-2.5" aria-label="Available coupons">
          {coupons.map((c) => {
            const short = Math.max(0, (c.min_order_amount ?? 0) - subtotal);
            return (
              <li key={c.code} className="flex items-start justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3" style={{ borderColor: short > 0 ? 'var(--border)' : 'var(--brand)', background: short > 0 ? 'var(--surface)' : 'var(--brand-soft)' }}>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-tight" style={{ color: 'var(--fg)' }}>{c.title}</p>
                  <span className="ui-chip ui-chip-brand mt-1.5">{c.code}</span>
                  <p className="text-[13px] mt-1.5" style={{ color: short > 0 ? 'var(--warn)' : 'var(--fg-muted)' }}>
                    {short > 0 ? `Add ${formatPrice(short)} more to use this` : [c.desc, c.expires].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button type="button" onClick={() => apply(c.code)} disabled={short > 0 || !!busy}
                  className="text-sm font-bold mt-0.5 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed" style={{ color: 'var(--brand)' }}>
                  {busy === c.code ? '…' : 'Apply'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
