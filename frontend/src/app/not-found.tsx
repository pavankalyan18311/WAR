import Link from 'next/link';

const POPULAR = [
  { href: '/products?sort=newest', label: 'New arrivals' },
  { href: '/collections', label: 'Collections' },
  { href: '/size-guide', label: 'Size guide' },
  { href: '/contact', label: 'Contact us' },
];

/** Site-wide 404. */
export default function NotFound() {
  return (
    <main className="ui-page w-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
        <div className="ui-card px-6 sm:px-12 py-12 sm:py-16 text-center">
          <p className="ui-heading leading-none mb-4" style={{ fontSize: 'clamp(4.5rem, 16vw, 8rem)', color: 'var(--brand)' }} aria-hidden>404</p>
          <span className="ui-chip ui-chip-brand mb-4">Error 404 — Page not found</span>
          <h1 className="ui-heading leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}>
            Lost, but <span style={{ color: 'var(--brand)' }}>no regrets.</span>
          </h1>
          <p className="text-[15px] leading-relaxed mt-4 mb-8 max-w-md mx-auto" style={{ color: 'var(--fg-muted)' }}>
            The page you&apos;re looking for has moved, sold out or never existed. Let&apos;s get you back to something good.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/products" className="ui-btn">Shop all products</Link>
            <Link href="/" className="ui-btn-ghost">Back to home</Link>
          </div>
        </div>
        <nav className="flex flex-wrap justify-center gap-2 mt-6" aria-label="Popular pages">
          {POPULAR.map((p) => (
            <Link key={p.href} href={p.href} className="ui-chip transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
