import Link from 'next/link';
import { ReactNode } from 'react';

export function LegalPage({ title, lastUpdated, children }: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Legal</p>
          <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>{title}</h1>
          <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>Last updated: {lastUpdated}</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
        <div className="prose-custom space-y-8" style={{ color: 'var(--fg)' }}>
          {children}
        </div>
        <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Questions? <Link href="/contact" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Contact us</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-black mb-3" style={{ color: 'var(--fg)' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--fg-muted)' }}>{children}</div>
    </section>
  );
}
