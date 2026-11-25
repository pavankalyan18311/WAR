'use client';

import { useEffect, useState } from 'react';
import { Package, Save } from 'lucide-react';

const fieldStyle = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };
const inputCls = 'mt-1 w-full px-3 py-2 rounded-lg text-sm';

/** Pickup location, parcel size/weight and auto courier assignment for Shiprocket bookings. */
export default function ShiprocketSettingsCard() {
  const [form, setForm] = useState({ pickup: '', weight: '', length: '', breadth: '', height: '', autoAssign: true });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.shiprocket;
        if (s) setForm({
          pickup: s.pickup_location, weight: String(s.weight_kg), length: String(s.length_cm),
          breadth: String(s.breadth_cm), height: String(s.height_cm), autoAssign: !!s.auto_assign,
        });
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiprocket_pickup_location: form.pickup,
          parcel_weight_kg: Number(form.weight),
          parcel_length_cm: Number(form.length),
          parcel_breadth_cm: Number(form.breadth),
          parcel_height_cm: Number(form.height),
          shiprocket_auto_assign: form.autoAssign,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setStatus({ ok: true, text: 'Shiprocket settings saved' });
    } catch (err: any) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold inline-flex items-center gap-2"><Package size={16} /> Shiprocket (courier booking)</h2>
      <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
        Used when orders are sent to Shiprocket. The delivery fee customers pay is set in Shipping &amp; Payments above.
      </p>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <label className="text-sm sm:col-span-2" style={{ color: 'var(--fg-muted)' }}>
          Pickup location name (exactly as in Shiprocket → Settings → Pickup Addresses)
          <input aria-label="Pickup location name" value={form.pickup} onChange={set('pickup')} maxLength={60} className={inputCls} style={fieldStyle} />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Packed weight per item (kg)
          <input aria-label="Weight per item (kg)" type="number" step="0.05" min={0.05} value={form.weight} onChange={set('weight')} className={inputCls} style={fieldStyle} />
        </label>
        <div className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Parcel size (cm) — length × breadth × height
          <div className="mt-1 grid grid-cols-3 gap-2">
            <input aria-label="Parcel length (cm)" type="number" min={1} value={form.length} onChange={set('length')} className="px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
            <input aria-label="Parcel breadth (cm)" type="number" min={1} value={form.breadth} onChange={set('breadth')} className="px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
            <input aria-label="Parcel height (cm)" type="number" min={1} value={form.height} onChange={set('height')} className="px-3 py-2 rounded-lg text-sm" style={fieldStyle} />
          </div>
        </div>
        <label className="flex items-start justify-between gap-4 sm:col-span-2">
          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Assign courier automatically
            <span className="block text-xs mt-0.5">Shiprocket picks the courier using your courier rules, then the pickup and label are created. Turn off to choose the courier yourself in Shiprocket.</span>
          </span>
          <input type="checkbox" aria-label="Assign courier automatically" checked={form.autoAssign} onChange={set('autoAssign')} className="mt-1" />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Shiprocket Settings'}
        </button>
        {status && <span className="text-sm font-semibold" style={{ color: status.ok ? 'var(--success)' : 'var(--danger)' }}>{status.text}</span>}
      </div>
    </section>
  );
}
