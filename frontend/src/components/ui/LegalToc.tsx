'use client';

import { useEffect, useState } from 'react';

/** Sticky "On this page" list built from the policy's sections; highlights the one in view. */
export default function LegalToc() {
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState('');

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-legal-title]'));
    setItems(sections.map((s) => ({ id: s.id, title: s.dataset.legalTitle ?? '' })));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  if (items.length < 3) return null;

  return (
    <nav aria-label="On this page" className="sticky top-32 ui-card px-3 py-4">
      <p className="text-xs font-bold uppercase tracking-wider px-2 mb-3" style={{ color: 'var(--fg-subtle)' }}>On this page</p>
      <ol className="space-y-0.5">
        {items.map((it, i) => {
          const on = active === it.id;
          return (
            <li key={it.id}>
              <a href={`#${it.id}`} className="flex gap-2 px-2 py-1.5 rounded-lg text-[13px] leading-snug transition-colors hover:bg-[var(--surface-2)]"
                style={{ background: on ? 'var(--brand-soft)' : undefined, color: on ? 'var(--brand)' : 'var(--fg-muted)', fontWeight: on ? 700 : 500 }}>
                <span className="tabular-nums flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>{it.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
