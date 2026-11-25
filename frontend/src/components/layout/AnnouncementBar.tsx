'use client';

import { useEffect, useState } from 'react';
import ShippingNote from '@/components/ui/ShippingNote';
import { storePolicy } from '@/lib/storePolicy';

const ROTATE_MS = 4000;

/** Ink strip above the header: cross-fades between store promises; pauses on hover; still for reduced motion. */
export default function AnnouncementBar() {
  const messages = [
    <ShippingNote key="ship" />,
    <span key="returns">{storePolicy.returnDays}-day returns &amp; size exchange</span>,
    <span key="cod">Cash on delivery available</span>,
  ];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, messages.length]);

  return (
    <div role="region" aria-label="Store announcements"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="w-full px-4 text-[10px] sm:text-[11px] tracking-[0.14em] sm:tracking-[0.18em] uppercase"
      style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
      <ul className="relative h-8 grid place-items-center">
        {messages.map((m, i) => (
          <li key={i} aria-hidden={i !== index}
            className="col-start-1 row-start-1 transition-all duration-700 ease-out text-center"
            style={{ opacity: i === index ? 1 : 0, transform: i === index ? 'translateY(0)' : 'translateY(4px)' }}>
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
