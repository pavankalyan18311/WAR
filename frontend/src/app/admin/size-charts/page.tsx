'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Ruler } from 'lucide-react';
import type { SizeChartInput, SizeUnit } from '@/lib/sizeCharts';

interface AdminChart extends SizeChartInput {
  id: string;
  product_count: number;
}
type Draft = SizeChartInput & { id?: string };

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };
const inputCls = 'w-full px-2.5 py-2 rounded-lg text-sm outline-none';

const NEW_CHART: Draft = {
  name: '', unit: 'in', columns: ['Chest', 'Length', 'Shoulder'], rows: [{ size: '', values: ['', '', ''] }], note: '', is_default: false,
};

function ChartEditor({ initial, onCancel, onSaved }: { initial: Draft; onCancel: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => structuredClone(initial));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setColumn = (j: number, name: string) => setD((x) => ({ ...x, columns: x.columns.map((c, k) => (k === j ? name : c)) }));
  const addColumn = () => setD((x) => ({ ...x, columns: [...x.columns, ''], rows: x.rows.map((r) => ({ ...r, values: [...r.values, ''] })) }));
  const removeColumn = (j: number) => setD((x) => ({
    ...x, columns: x.columns.filter((_, k) => k !== j), rows: x.rows.map((r) => ({ ...r, values: r.values.filter((_, k) => k !== j) })),
  }));
  const setSize = (i: number, size: string) => setD((x) => ({ ...x, rows: x.rows.map((r, k) => (k === i ? { ...r, size } : r)) }));
  const setValue = (i: number, j: number, v: string) => setD((x) => ({
    ...x, rows: x.rows.map((r, k) => (k === i ? { ...r, values: r.values.map((old, m) => (m === j ? v : old)) } : r)),
  }));
  const addRow = () => setD((x) => ({ ...x, rows: [...x.rows, { size: '', values: x.columns.map(() => '') }] }));
  const removeRow = (i: number) => setD((x) => ({ ...x, rows: x.rows.filter((_, k) => k !== i) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { id, ...body } = d;
      const res = await fetch(id ? `/api/admin/size-charts/${id}` : '/api/admin/size-charts', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the size chart.');
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form aria-label="Size chart editor" onSubmit={save} className="rounded-2xl p-5 space-y-5" style={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{d.id ? `Edit ${initial.name}` : 'New size chart'}</h2>
        <button type="button" onClick={onCancel} aria-label="Close editor"><X size={18} /></button>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>}

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="sm:col-span-2 text-xs font-semibold">Chart name
          <input aria-label="Chart name" className={`${inputCls} mt-1`} style={field} value={d.name} maxLength={60}
            placeholder="e.g. Oversized T-Shirt" onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold">Unit
          <select aria-label="Unit" className={`${inputCls} mt-1`} style={field} value={d.unit}
            onChange={(e) => setD((x) => ({ ...x, unit: e.target.value as SizeUnit }))}>
            <option value="in">Inches</option>
            <option value="cm">Centimetres</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold pb-2 pr-2">Size</th>
              {d.columns.map((c, j) => (
                <th key={j} className="pb-2 pr-2 min-w-[110px]">
                  <div className="flex items-center gap-1">
                    <input aria-label={`Column name ${j + 1}`} className={inputCls} style={field} value={c} maxLength={30}
                      placeholder="e.g. Chest" onChange={(e) => setColumn(j, e.target.value)} />
                    {d.columns.length > 1 && (
                      <button type="button" onClick={() => removeColumn(j)} aria-label={`Remove column ${c || j + 1}`} className="p-1" style={{ color: 'var(--fg-muted)' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="pb-2">
                <button type="button" onClick={addColumn} className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-2 rounded-lg whitespace-nowrap" style={{ background: 'var(--bg-subtle)' }}>
                  <Plus size={12} /> Add column
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {d.rows.map((r, i) => (
              <tr key={i}>
                <td className="pr-2 pb-2 w-24">
                  <input aria-label={`Size name ${i + 1}`} className={inputCls} style={field} value={r.size} placeholder="M"
                    onChange={(e) => setSize(i, e.target.value)} />
                </td>
                {d.columns.map((c, j) => (
                  <td key={j} className="pr-2 pb-2">
                    <input aria-label={`${c || `Column ${j + 1}`} for ${r.size || `size ${i + 1}`}`} className={inputCls} style={field}
                      value={r.values[j] ?? ''} maxLength={20} placeholder="44" onChange={(e) => setValue(i, j, e.target.value)} />
                  </td>
                ))}
                <td className="pb-2">
                  {d.rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} aria-label={`Remove size ${r.size || i + 1}`} className="p-2" style={{ color: 'var(--fg-muted)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg mt-1" style={{ background: 'var(--bg-subtle)' }}>
          <Plus size={12} /> Add size
        </button>
        <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>Ranges like 38-40 are fine. Customers can switch between inches and cm.</p>
      </div>

      <label className="block text-xs font-semibold">Note for customers (optional)
        <textarea aria-label="Note" className={`${inputCls} mt-1 min-h-[70px]`} style={field} maxLength={500} value={d.note ?? ''}
          placeholder="e.g. Garment measurements, laid flat. Oversized fit — size down for a regular look."
          onChange={(e) => setD((x) => ({ ...x, note: e.target.value }))} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.is_default} onChange={(e) => setD((x) => ({ ...x, is_default: e.target.checked }))} />
        Store default — used for every product that doesn&apos;t pick its own chart
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-subtle)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {saving ? 'Saving…' : 'Save chart'}
        </button>
      </div>
    </form>
  );
}

export default function AdminSizeChartsPage() {
  const [charts, setCharts] = useState<AdminChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/size-charts');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load size charts.');
      setCharts(data.charts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    setConfirmDelete(null);
    const res = await fetch(`/api/admin/size-charts/${id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Could not delete the size chart.'); return; }
    setCharts((list) => list.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Size Charts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Shown when customers tap &ldquo;Size guide&rdquo;. Products use the default chart unless you pick another one on the product.
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(structuredClone(NEW_CHART))} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Plus size={14} /> New size chart
          </button>
        )}
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>}

      {editing && (
        <ChartEditor key={editing.id ?? 'new'} initial={editing} onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }} />
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</p>
      ) : charts.length === 0 && !editing ? (
        <div className="rounded-2xl p-10 text-center text-sm" style={{ ...card, color: 'var(--fg-muted)' }}>
          <Ruler size={28} className="mx-auto mb-2 opacity-50" /> No size charts yet. Create one so customers can check their fit.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {charts.map((c) => (
            <article key={c.id} className="rounded-2xl p-5" style={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{c.name}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                    {c.is_default && <span className="font-semibold" style={{ color: 'var(--success)' }}>Default · </span>}
                    {c.product_count} products chose this · {c.rows.length} sizes · {c.unit === 'in' ? 'inches' : 'cm'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ ...c })} aria-label={`Edit ${c.name}`} className="p-2 rounded-lg" style={{ background: 'var(--bg-subtle)' }}><Pencil size={14} /></button>
                  <button onClick={() => setConfirmDelete(c.id)} aria-label={`Delete ${c.name}`} className="p-2 rounded-lg" style={{ background: 'var(--bg-subtle)' }}><Trash2 size={14} /></button>
                </div>
              </div>

              {confirmDelete === c.id && (
                <p className="text-xs mt-3 flex flex-wrap items-center gap-2">
                  Delete this chart?{c.product_count > 0 && ` Its ${c.product_count} products will use the default chart.`}
                  <button onClick={() => remove(c.id)} className="font-semibold" style={{ color: '#ef4444' }}>Yes, delete</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ color: 'var(--fg-muted)' }}>Cancel</button>
                </p>
              )}

              <div className="overflow-x-auto mt-4">
                <table className="text-xs w-full">
                  <thead><tr>{['Size', ...c.columns].map((h) => <th key={h} className="text-left pr-3 pb-1 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {c.rows.map((r) => (
                      <tr key={r.size}><td className="pr-3 py-0.5 font-semibold">{r.size}</td>{r.values.map((v, i) => <td key={i} className="pr-3 py-0.5" style={{ color: 'var(--fg-muted)' }}>{v || '—'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
