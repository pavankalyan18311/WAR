'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { useReturnDays } from '@/hooks/useReturnDays';
import { DEFAULT_ANNOUNCEMENTS, fillAnnouncement, type AnnouncementSettings } from '@/lib/homeContent';

const ROTATE_MS = 4000;

/**
 * Ink strip above the header: cross-fades between the messages set in Admin → Homepage → Announcement bar.
 * {free_shipping} / {return_days} show the live store settings. Pauses on hover; still for reduced motion.
 */
export default function AnnouncementBar() {
  const [settings, setSettings] = useState<AnnouncementSettings>(DEFAULT_ANNOUNCEMENTS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const threshold = useCartStore((s) => s.shippingSettings.free_shipping_threshold);
  const returnDays = useReturnDays();

  useEffect(() => {
    let live = true;
    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AnnouncementSettings | null) => {
        if (live && d && Array.isArray(d.items) && d.items.length) { setSettings(d); setIndex(0); }
      })
      .catch(() => { /* keep the defaults */ });
    return () => { live = false; };
  }, []);

  const messages = settings.items.map((t) => fillAnnouncement(t, { freeShipping: formatPrice(threshold), returnDays }));

  useEffect(() => {
    if (paused || messages.length <= 1 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, messages.length]);

  if (!settings.enabled) return null;

  return (
    <div role="region" aria-label="Store announcements"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="w-full px-4 text-[10px] sm:text-[11px] tracking-[0.14em] sm:tracking-[0.18em] uppercase"
      style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
      <ul className="relative h-8 grid place-items-center">
        {messages.map((m, i) => (
          <li key={i} aria-hidden={i !== index % messages.length}
            className="col-start-1 row-start-1 transition-all duration-700 ease-out text-center"
            style={{ opacity: i === index % messages.length ? 1 : 0, transform: i === index % messages.length ? 'translateY(0)' : 'translateY(4px)' }}>
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
