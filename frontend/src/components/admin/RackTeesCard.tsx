'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Shirt, Star, Trash2 } from 'lucide-react';
import type { RackTeeRow } from '@/lib/rackHero';

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };
const inputCls = 'mt-1 w-full px-3 py-2 rounded-lg text-sm';

type Status = { ok: boolean; text: string } | null;
type Tee = RackTeeRow & { sort_order: number; is_active: boolean };

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

/** Upload one photo to the "products" bucket; returns its public URL. */
async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/admin/uploads', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed. Please try again.');
  return data.url;
}

function StatusLine({ s }: { s: Status }) {
  if (!s) return null;
  return <span role={s.ok ? 'status' : 'alert'} className="text-sm font-semibold" style={{ color: s.ok ? '#16a34a' : '#ef4444' }}>{s.text}</span>;
}

function TeeItem({ tee, index, count, busy, onAct, onMove }: {
  tee: Tee; index: number; count: number; busy: boolean;
  onAct: (fn: () => Promise<unknown>, done?: string) => void; onMove: (dir: -1 | 1) => void;
}) {
  const [name, setName] = useState(tee.name);
  const [price, setPrice] = useState(String(Number(tee.price)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const url = `/api/admin/rack/${tee.id}`;

  const replacePhoto = (which: 'front_url' | 'back_url', file: File | undefined) => {
    if (!file) return;
    onAct(async () => send(url, 'PATCH', { [which]: await uploadPhoto(file) }), 'Photo replaced — live on the homepage');
  };

  const photo = (src: string | null, side: 'front' | 'back') => (
    <div className="relative aspect-[4/5] rounded-lg overflow-hidden" style={{ background: '#fff' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${tee.name} — ${side}`} className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] text-center px-2" style={{ color: '#888' }}>No back photo — tee won&apos;t flip</span>
      )}
    </div>
  );

  return (
    <li className="rounded-xl p-3 space-y-3" style={{ ...card, opacity: tee.is_active ? 1 : 0.5 }}>
      <div className="grid grid-cols-2 gap-2">
        {photo(tee.front_url, 'front')}
        {photo(tee.back_url, 'back')}
        <label className="text-[11px] cursor-pointer text-center rounded-lg py-1" style={field}>
          Replace front
          <input type="file" accept="image/*" aria-label="Replace front photo" className="sr-only"
            onChange={(e) => replacePhoto('front_url', e.target.files?.[0])} />
        </label>
        <label className="text-[11px] cursor-pointer text-center rounded-lg py-1" style={field}>
          {tee.back_url ? 'Replace back' : 'Add back'}
          <input type="file" accept="image/*" aria-label="Replace back photo" className="sr-only"
            onChange={(e) => replacePhoto('back_url', e.target.files?.[0])} />
        </label>
      </div>

      <label className="text-sm block" style={{ color: 'var(--fg-muted)' }}>
        Name
        <input aria-label="Name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={inputCls} style={field} />
      </label>
      <label className="text-sm block" style={{ color: 'var(--fg-muted)' }}>
        Price (₹)
        <input aria-label="Price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} style={field} />
      </label>

      <button type="button" disabled={busy}
        onClick={() => onAct(() => send(url, 'PATCH', { name, price }), 'Saved — live on the homepage')}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        <Save size={14} /> Save
      </button>

      {tee.is_featured ? (
        <p className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: '#F36E21' }}>
          <Star size={12} fill="currentColor" /> Faces forward first
        </p>
      ) : (
        <button type="button" disabled={busy} onClick={() => onAct(() => send(url, 'PATCH', { is_featured: true }))}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold" style={field}>
          <Star size={12} /> Face forward first
        </button>
      )}

      <div className="flex flex-wrap gap-1">
        <button type="button" aria-label="Move left" disabled={index === 0 || busy} onClick={() => onMove(-1)} className="p-1.5 rounded-lg disabled:opacity-30" style={field}><ArrowUp size={12} className="-rotate-90" /></button>
        <button type="button" aria-label="Move right" disabled={index === count - 1 || busy} onClick={() => onMove(1)} className="p-1.5 rounded-lg disabled:opacity-30" style={field}><ArrowDown size={12} className="-rotate-90" /></button>
        <button type="button" disabled={busy} onClick={() => onAct(() => send(url, 'PATCH', { is_active: !tee.is_active }))}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold" style={field}>
          {tee.is_active ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
        </button>
        {confirmDelete ? (
          <button type="button" onClick={() => { setConfirmDelete(false); onAct(() => send(url, 'DELETE')); }}
            className="px-2 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Yes, delete</button>
        ) : (
          <button type="button" aria-label="Delete" onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg" style={field}><Trash2 size={12} /></button>
        )}
      </div>
    </li>
  );
}

/** The tees hanging on the homepage rack: add, edit, photos, order, show/hide, which faces forward first. */
export default function RackTeesCard() {
  const [tees, setTees] = useState<Tee[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/rack');
    const data = await res.json().catch(() => ({}));
    if (res.ok) setTees(data.tees ?? []);
    else setStatus({ ok: false, text: data.error || 'Could not load rack tees.' });
  }, []);

  useEffect(() => {
    fetch('/api/admin/rack')
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => ({})) }))
      .then(({ ok, data }) => (ok ? setTees(data.tees ?? []) : setStatus({ ok: false, text: data.error || 'Could not load rack tees.' })))
      .catch(() => setStatus({ ok: false, text: 'Could not load rack tees.' }));
  }, []);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
      await load();
      if (done) setStatus({ ok: true, text: done });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const a = tees[i];
    const b = tees[i + dir];
    if (!a || !b) return;
    act(async () => {
      await send(`/api/admin/rack/${a.id}`, 'PATCH', { sort_order: b.sort_order });
      await send(`/api/admin/rack/${b.id}`, 'PATCH', { sort_order: a.sort_order });
    });
  };

  const addTee = () => {
    if (!name.trim() || !price.trim() || !front) {
      setStatus({ ok: false, text: 'Add a name, price and front photo first.' });
      return;
    }
    act(async () => {
      const front_url = await uploadPhoto(front);
      const back_url = back ? await uploadPhoto(back) : null;
      await send('/api/admin/rack', 'POST', { name, price, front_url, back_url });
      setName(''); setPrice(''); setFront(null); setBack(null);
      setFormKey((k) => k + 1); // clears the file inputs
    }, 'Tee added — it is hanging on the homepage rack');
  };

  return (
    <section className="rounded-2xl p-5 space-y-5" style={card}>
      <div>
        <h2 className="font-semibold inline-flex items-center gap-2"><Shirt size={16} /> Rack tees</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
          The tees hanging on the rail at the top of the homepage. Use <strong>laid-flat photos on a plain white background</strong> (JPG/PNG,
          under 5 MB) — the white disappears into the page. The back photo is optional; with one, visitors click the tee to flip it. &ldquo;Shop the drop&rdquo; takes them to the shop page. 4–7 tees look best.
          Hiding every tee hides the rack.
        </p>
      </div>

      <div key={formKey} className="grid md:grid-cols-3 lg:grid-cols-5 gap-3 items-end p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Name
          <input aria-label="New tee name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Three Sword Jersey" className={inputCls} style={field} />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Price (₹)
          <input aria-label="New tee price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1799" className={inputCls} style={field} />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Front photo
          <input aria-label="New tee front photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => setFront(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Back photo (optional)
          <input aria-label="New tee back photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => setBack(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </label>
        <button type="button" onClick={addTee} disabled={busy}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Plus size={14} /> {busy ? 'Working…' : 'Add tee'}
        </button>
      </div>
      <StatusLine s={status} />

      {tees.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No tees yet — the rack stays hidden on the homepage until you add one.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tees.map((t, i) => (
            <TeeItem key={`${t.id}-${t.name}-${t.price}`} tee={t} index={i} count={tees.length}
              busy={busy} onAct={act} onMove={(dir) => move(i, dir)} />
          ))}
        </ul>
      )}
    </section>
  );
}
