'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Link2, MoreHorizontal } from 'lucide-react';

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .06A11.9 11.9 0 0 0 1.5 11.55c0 2.07.54 4.06 1.56 5.83L.12 23.4l6.18-1.62A11.87 11.87 0 0 0 12 23.1c6.59 0 11.98-5.36 11.98-11.98S18.59.06 12 .06zm0 21.3c-1.8 0-3.56-.48-5.08-1.38l-.36-.22-3.66.96.98-3.54-.24-.38A9.12 9.12 0 0 1 2.88 11.6 9.1 9.1 0 0 1 12 2.5c5.04 0 9.12 4.08 9.12 9.12S17.04 21.36 12 21.36z" />
  </svg>
);

/** Share button with a small menu: WhatsApp, copy link, and the phone's share sheet when available. */
export default function ShareMenu({ title, url }: { title: string; url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1600);
    } catch { /* clipboard blocked */ }
  };

  const nativeShare = async () => {
    try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    setOpen(false);
  };

  const item = 'w-full flex items-center gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-left hover:bg-[var(--bg-elevated)]';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Share" aria-haspopup="menu" aria-expanded={open}
        className="w-14 h-full min-h-[3.25rem] flex items-center justify-center border transition-colors hover:border-[var(--fg)]"
        style={{ borderColor: open ? 'var(--fg)' : 'var(--border-strong)' }}>
        <Share2 size={17} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 z-30 border animate-fade-in"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-md)' }}>
          <a role="menuitem" className={item} href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}>
            <WhatsAppIcon /> WhatsApp
          </a>
          <button role="menuitem" type="button" className={item} onClick={copy}>
            <Link2 size={15} /> {copied ? 'Link copied' : 'Copy link'}
          </button>
          {canNativeShare && (
            <button role="menuitem" type="button" className={item} onClick={nativeShare}>
              <MoreHorizontal size={15} /> More options
            </button>
          )}
        </div>
      )}
    </div>
  );
}
