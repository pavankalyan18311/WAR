import Link from 'next/link';
import { ReactNode } from 'react';
import LegalToc from '@/components/ui/LegalToc';

const slug = (s: string) => s.toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Long-form layout for policy pages: card header, numbered sections, sticky contents on desktop. */
export function LegalPage({ title, lastUpdated, children }: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main className="ui-page w-full">
      {/* Numbering is done with CSS counters so the pages' own markup stays untouched. */}
      <style>{`
        .legal-body { counter-reset: legal; }
        .legal-section { counter-increment: legal; }
        .legal-num::before { content: counter(legal, decimal-leading-zero); }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-20">
        <header className="ui-card px-5 sm:px-8 py-8 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="ui-chip ui-chip-brand">Legal</span>
            <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>Last updated {lastUpdated}</span>
          </div>
          <h1 className="ui-heading leading-[1.02] max-w-3xl" style={{ fontSize: 'clamp(2.1rem, 5vw, 3.4rem)' }}>{title}</h1>
        </header>

        <div className="grid lg:grid-cols-12 gap-6">
          <aside className="hidden lg:block lg:col-span-3">
            <LegalToc />
          </aside>

          <div className="lg:col-span-9">
            <div className="ui-card px-5 sm:px-10 py-8 sm:py-10">
              <div className="legal-body space-y-10" style={{ color: 'var(--fg)' }}>
                {children}
              </div>
            </div>
            <div className="ui-card-soft mt-6 px-5 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4">
              <p className="ui-heading text-lg">Questions about this policy?</p>
              <Link href="/contact" className="ui-btn">Contact us</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const clean = title.replace(/^\d+\.\s*/, '');
  return (
    <section id={slug(title)} className="legal-section scroll-mt-32" data-legal-title={clean}>
      <div className="flex items-center gap-3 mb-4">
        <span aria-hidden className="legal-num w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold tabular-nums flex-shrink-0"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }} />
        <h2 className="ui-heading text-xl sm:text-2xl leading-tight">{clean}</h2>
      </div>
      <div className="text-[15px] leading-[1.75] space-y-4 [&_a]:text-[var(--brand)] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-[var(--fg)]"
        style={{ color: 'var(--fg-muted)' }}>
        {children}
      </div>
    </section>
  );
}
