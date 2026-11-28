'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Bell, Eye, EyeOff, Film, Megaphone, Save, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { instagramEmbedUrl, type MarqueeSettings, type Reel } from '@/lib/homeContent';
import InstagramEmbed from '@/components/home/InstagramEmbed';
import RackTeesCard from '@/components/admin/RackTeesCard';

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };
const inputCls = 'mt-1 w-full px-3 py-2 rounded-lg text-sm';

function Status({ s }: { s: { ok: boolean; text: string } | null }) {
  if (!s) return null;
  return <span role={s.ok ? 'status' : 'alert'} className="text-sm font-semibold" style={{ color: s.ok ? '#16a34a' : '#ef4444' }}>{s.text}</span>;
}

/** The black announcement bar above the header: messages (one per line) + on/off, with a preview. */
function AnnouncementsCard() {
  const [texts, setTexts] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/home').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d?.announcements) return;
      setTexts(d.announcements.items.join('\n'));
      setEnabled(d.announcements.enabled !== false);
    }).catch(() => {});
  }, []);

  if (texts === null) return <section className="rounded-2xl p-5 h-40 skeleton" />;
  const items = texts.split('\n').map((t) => t.trim()).filter(Boolean);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcements: { enabled, items } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setStatus({ ok: true, text: 'Saved — live at the top of every page' });
    } catch (err: any) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl p-5 space-y-4" style={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold inline-flex items-center gap-2"><Bell size={16} /> Announcement bar</h2>
        <label className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <input type="checkbox" aria-label="Show announcement bar" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Show bar
        </label>
      </div>
      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        The black strip above the menu on every page; the messages take turns every few seconds. Type{' '}
        <code>{'{free_shipping}'}</code> for your free-shipping amount and <code>{'{return_days}'}</code> for your return days —
        they update by themselves when those settings change.
      </p>
      <label className="text-sm block" style={{ color: 'var(--fg-muted)' }}>
        Messages — one per line (up to 6, max 80 characters each)
        <textarea aria-label="Announcement messages" value={texts} onChange={(e) => setTexts(e.target.value)} rows={4}
          className={`${inputCls} font-medium`} style={field} />
      </label>
      <div>
        <p className="text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Preview</p>
        <div data-testid="announcement-preview" className="rounded-lg py-2 px-3 flex flex-wrap gap-x-6 gap-y-1 justify-center text-[11px] uppercase tracking-[0.18em]"
          style={{ background: 'var(--fg)', color: 'var(--bg)', opacity: enabled ? 1 : 0.4 }}>
          {items.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save announcements'}
        </button>
        <Status s={status} />
      </div>
    </section>
  );
}

/** Scrolling banner under the hero: texts + colours, with a live preview. */
function BannerCard() {
  const [m, setM] = useState<MarqueeSettings | null>(null);
  const [texts, setTexts] = useState('');
  const [instagram, setInstagram] = useState('');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/home').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setM(d.marquee);
      setTexts(d.marquee.items.join('\n'));
      setInstagram(d.instagram_url ?? '');
    }).catch(() => {});
  }, []);

  if (!m) return <section className="rounded-2xl p-5 h-40 skeleton" />;
  const items = texts.split('\n').map((t) => t.trim()).filter(Boolean);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marquee: { ...m, items }, instagram_url: instagram }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setStatus({ ok: true, text: 'Saved — live on the homepage' });
    } catch (err: any) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const colour = (key: 'background' | 'text_color' | 'accent_color', label: string) => (
    <label className="text-sm flex items-center justify-between gap-3" style={{ color: 'var(--fg-muted)' }}>
      {label}
      <span className="flex items-center gap-2">
        <input type="color" aria-label={label} value={m[key]} onChange={(e) => setM({ ...m, [key]: e.target.value })}
          className="w-10 h-8 rounded cursor-pointer border" style={{ borderColor: 'var(--border)' }} />
        <code className="text-xs">{m[key]}</code>
      </span>
    </label>
  );

  return (
    <section className="rounded-2xl p-5 space-y-4" style={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold inline-flex items-center gap-2"><Megaphone size={16} /> Scrolling banner</h2>
        <label className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
          <input type="checkbox" checked={m.enabled} onChange={(e) => setM({ ...m, enabled: e.target.checked })} /> Show banner
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Banner texts — one per line (up to 12, max 40 characters each)
          <textarea aria-label="Banner texts" value={texts} onChange={(e) => setTexts(e.target.value)} rows={6}
            className={`${inputCls} font-medium`} style={field} />
        </label>
        <div className="space-y-3">
          {colour('background', 'Background colour')}
          {colour('text_color', 'Text colour')}
          {colour('accent_color', 'Star (✦) colour')}
          <label className="text-sm block" style={{ color: 'var(--fg-muted)' }}>
            Instagram profile (link or @handle)
            <input aria-label="Instagram profile" value={instagram} onChange={(e) => setInstagram(e.target.value)}
              placeholder="@yourbrand" className={inputCls} style={field} />
          </label>
        </div>
      </div>

      <div>
        <p className="text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>Preview</p>
        <div data-testid="marquee-preview" className="overflow-hidden rounded-lg py-2.5 whitespace-nowrap"
          style={{ background: m.background, color: m.text_color, opacity: m.enabled ? 1 : 0.4 }}>
          {items.map((t, i) => (
            <span key={i} className="font-display italic text-base px-4">
              {t} <span className="not-italic text-xs ml-3" style={{ color: m.accent_color }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save banner'}
        </button>
        <Status s={status} />
      </div>
    </section>
  );
}

/** Instagram reels on the homepage: upload, link, caption, order, show/hide, delete. */
function ReelsCard() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/reels');
    const data = await res.json().catch(() => ({}));
    if (res.ok) setReels(data.reels ?? []);
    else setStatus({ ok: false, text: data.error || 'Could not load reels.' });
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  };

  const addReel = async () => {
    if (!file && !link.trim()) { setStatus({ ok: false, text: 'Paste an Instagram reel link or choose a video.' }); return; }
    setBusy('add');
    setStatus(null);
    try {
      if (file) {
        const ticket = await send('/api/admin/uploads/media', 'POST', { content_type: file.type, size: file.size });
        const { error } = await createClient().storage.from('media').uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (error) throw new Error('Upload failed. Please try again.');
        await send('/api/admin/reels', 'POST', { video_url: ticket.publicUrl, link_url: link, caption });
        setStatus({ ok: true, text: 'Reel added — it is live on the homepage' });
      } else {
        // Link only: copy the video from our own Instagram account so it autoplays…
        const res = await fetch('/api/admin/reels/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_url: link, caption }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus({ ok: true, text: 'Reel imported — it plays automatically on the homepage' });
        } else if (data.code === 'not_connected' || data.code === 'not_found') {
          // …or, when that isn't possible, show it with Instagram's own player.
          await send('/api/admin/reels', 'POST', { link_url: link, caption });
          const why = data.code === 'not_connected' ? 'Instagram is not connected yet' : 'this reel is not on your connected account';
          setStatus({ ok: true, text: `Reel added with Instagram's player (tap to play) — ${why}.` });
        } else {
          throw new Error(data.error || 'Could not import the reel.');
        }
      }
      setFile(null); setLink(''); setCaption('');
      await load();
    } catch (err: any) {
      setStatus({ ok: false, text: err.message });
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setStatus(null);
    try { await fn(); await load(); } catch (err: any) { setStatus({ ok: false, text: err.message }); } finally { setBusy(null); }
  };
  const move = (i: number, dir: -1 | 1) => {
    const a = reels[i]; const b = reels[i + dir];
    if (!a || !b) return;
    act(a.id, async () => {
      await send(`/api/admin/reels/${a.id}`, 'PATCH', { sort_order: b.sort_order });
      await send(`/api/admin/reels/${b.id}`, 'PATCH', { sort_order: a.sort_order });
    });
  };

  return (
    <section className="rounded-2xl p-5 space-y-5" style={card}>
      <div>
        <h2 className="font-semibold inline-flex items-center gap-2"><Film size={16} /> Instagram reels</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
          Shown on the homepage in place of the old Shipping/Returns/Payments row. Add a reel in either of two ways:
          <strong> paste its Instagram reel link</strong> (quickest — with Instagram connected, the video is copied from your account and
          plays automatically; otherwise it is shown with Instagram&apos;s own player and plays when tapped), or
          <strong> upload the video</strong> (MP4, vertical 9:16, under 50 MB — plays automatically on a silent loop, best look). 4–5 reels look best.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-4 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Reel video (optional if you paste a link)
          <input aria-label="Reel video" type="file" accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Instagram link for this reel
          <input aria-label="Instagram link for this reel" value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.instagram.com/reel/…" className={inputCls} style={field} />
        </label>
        <label className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Caption (optional)
          <input aria-label="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120}
            placeholder="e.g. Drop 02 — Midnight Black" className={inputCls} style={field} />
        </label>
        <button type="button" onClick={addReel} disabled={busy === 'add'}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Upload size={14} /> {busy === 'add' ? (file ? 'Uploading…' : 'Adding…') : 'Add reel'}
        </button>
      </div>
      <Status s={status} />

      {reels.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No reels yet — the section stays hidden on the homepage until you add one.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {reels.map((r, i) => (
            <li key={r.id} className="rounded-xl overflow-hidden" style={{ ...card, opacity: r.is_active ? 1 : 0.5 }}>
              {r.video_url ? (
                <video src={r.video_url} poster={r.poster_url ?? undefined} muted loop playsInline autoPlay preload="metadata" className="w-full aspect-[9/16] object-cover bg-black" />
              ) : (
                <div className="relative w-full aspect-[9/16] overflow-hidden bg-black">
                  <InstagramEmbed src={instagramEmbedUrl(r.link_url) ?? ''} title={`Instagram reel preview${r.caption ? `: ${r.caption}` : ''}`} />
                </div>
              )}
              <div className="p-2.5 space-y-2">
                <p className="text-xs font-semibold truncate">{r.caption || 'No caption'}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>{r.link_url || 'Links to your profile'}</p>
                <div className="flex flex-wrap gap-1">
                  <button type="button" aria-label="Move left" disabled={i === 0 || !!busy} onClick={() => move(i, -1)} className="p-1.5 rounded-lg disabled:opacity-30" style={field}><ArrowUp size={12} className="-rotate-90" /></button>
                  <button type="button" aria-label="Move right" disabled={i === reels.length - 1 || !!busy} onClick={() => move(i, 1)} className="p-1.5 rounded-lg disabled:opacity-30" style={field}><ArrowDown size={12} className="-rotate-90" /></button>
                  <button type="button" disabled={!!busy} onClick={() => act(r.id, () => send(`/api/admin/reels/${r.id}`, 'PATCH', { is_active: !r.is_active }))}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold" style={field}>
                    {r.is_active ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                  {confirmDelete === r.id ? (
                    <button type="button" onClick={() => { setConfirmDelete(null); act(r.id, () => send(`/api/admin/reels/${r.id}`, 'DELETE')); }}
                      className="px-2 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Yes, delete</button>
                  ) : (
                    <button type="button" aria-label="Delete" onClick={() => setConfirmDelete(r.id)} className="p-1.5 rounded-lg" style={field}><Trash2 size={12} /></button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminHomepagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Edit the rack tees, the announcement bar, the scrolling banner and the Instagram reels. Changes go live straight away.</p>
      </div>
      <RackTeesCard />
      <AnnouncementsCard />
      <BannerCard />
      <ReelsCard />
    </div>
  );
}
