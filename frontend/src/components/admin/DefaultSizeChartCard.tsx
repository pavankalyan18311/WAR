'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ruler, Save } from 'lucide-react';

type Chart = { id: string; name: string; is_default: boolean };

/** Settings card: which size chart products use when they don't pick their own. */
export default function DefaultSizeChartCard() {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [selected, setSelected] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/size-charts')
      .then((r) => (r.ok ? r.json() : { charts: [] }))
      .then((d) => {
        setCharts(d.charts ?? []);
        setSelected((d.charts ?? []).find((c: Chart) => c.is_default)?.id ?? '');
      })
      .catch(() => setStatus({ ok: false, text: 'Could not load size charts.' }));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/size-charts/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setCharts((list) => list.map((c) => ({ ...c, is_default: c.id === selected })));
      setStatus({ ok: true, text: 'Saved — products without their own chart now show this one.' });
    } catch (err: any) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const current = charts.find((c) => c.is_default)?.id ?? '';

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold inline-flex items-center gap-2"><Ruler size={16} /> Default size chart</h2>
      <p className="text-xs mt-1 mb-4" style={{ color: 'var(--fg-muted)' }}>
        Shown on every product that doesn&apos;t pick its own chart. Edit the charts themselves under{' '}
        <Link href="/admin/size-charts" className="underline">Size Charts</Link>.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="Default size chart" value={selected} onChange={(e) => setSelected(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none min-w-[220px]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
          <option value="">None — no size guide unless the product picks one</option>
          {charts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="button" onClick={save} disabled={saving || selected === current}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save default'}
        </button>
      </div>
      {status && <p className="text-xs mt-2" style={{ color: status.ok ? 'var(--success)' : 'var(--danger)' }}>{status.text}</p>}
    </section>
  );
}
