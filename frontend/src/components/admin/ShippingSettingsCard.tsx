'use client';

import { useEffect, useState } from 'react';
import { Save, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { DEFAULT_RETURN_DAYS } from '@/lib/checkout/storeSettings';
import type { StoreSettings } from '@/lib/checkout/pricing';

const fieldStyle = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };

/** Free-delivery rules, COD switch and return window — saved to the database, used across the store. */
export default function ShippingSettingsCard() {
  const current = useCartStore((s) => s.shippingSettings);
  const loadShippingSettings = useCartStore((s) => s.loadShippingSettings);
  useEffect(() => { loadShippingSettings(); }, [loadShippingSettings]);
  // Restart the form whenever the saved settings change (first load, or after saving).
  return <SettingsForm key={JSON.stringify(current)} current={current} reload={loadShippingSettings} />;
}

function SettingsForm({ current, reload }: { current: StoreSettings; reload: () => Promise<void> }) {
  const [threshold, setThreshold] = useState(String(current.free_shipping_threshold));
  const [fee, setFee] = useState(String(current.shipping_fee));
  const [codEnabled, setCodEnabled] = useState(current.cod_enabled);
  const [returnDays, setReturnDays] = useState(String(current.return_days ?? DEFAULT_RETURN_DAYS));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);


  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ free_shipping_threshold: Number(threshold), shipping_fee: Number(fee), cod_enabled: codEnabled, return_days: Number(returnDays) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save settings.');
      setStatus({ ok: true, text: 'Settings saved — live across the store' });
      await reload();
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold inline-flex items-center gap-2"><Truck size={16} /> Shipping, Payments &amp; Returns</h2>
      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Free delivery on orders above (₹)
          <input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Delivery fee below that amount (₹)
          <input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Return / exchange window (days)
          <input type="number" min={1} max={60} step={1} value={returnDays} onChange={(e) => setReturnDays(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          <span className="block mt-1 text-xs" style={{ color: 'var(--fg-subtle)' }}>
            Shown on product pages, cart, checkout, FAQ, refund policy, order emails and the announcement bar.
          </span>
        </label>
        <label className="flex items-center justify-between sm:col-span-2">
          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>Allow Cash on Delivery</span>
          <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save settings'}
        </button>
        {status && <span className="text-sm font-semibold" style={{ color: status.ok ? '#22c55e' : '#ef4444' }}>{status.text}</span>}
      </div>
    </section>
  );
}
