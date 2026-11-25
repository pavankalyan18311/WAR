import Link from 'next/link';
import Image from 'next/image';

const HERO_IMG = '/images/Hero_banner.png';

/** Editorial split hero: serif statement on paper, framed campaign image. */
export default function HeroVideoBanner() {
  return (
    <section className="relative w-full border-b" style={{ borderColor: 'var(--border)' }} aria-label="WAR — Without Any Regrets">
      <div className="max-w-7xl mx-auto grid md:grid-cols-12 min-h-[78vh]">
        {/* Statement */}
        <div className="md:col-span-5 flex flex-col justify-between px-5 sm:px-8 py-12 md:py-16 order-2 md:order-1">
          <p className="eyebrow">Drop 01 — Oversized Tees</p>

          <div className="my-10 md:my-0">
            <h1 className="leading-[0.95]" style={{ fontSize: 'clamp(3.2rem, 7.2vw, 6.4rem)' }}>
              Without
              <br />
              Any <em className="italic" style={{ color: 'var(--accent)' }}>Regrets.</em>
            </h1>
            <p className="mt-7 text-[15px] leading-relaxed max-w-sm" style={{ color: 'var(--fg-muted)' }}>
              Heavyweight oversized tees, cut for an easy drape and made to be lived in. Wear what you mean.
            </p>
            <div className="flex flex-wrap gap-3 mt-9">
              <Link href="/products?sort=newest" data-testid="hero-shop-cta" className="btn-primary">Shop the drop</Link>
              <Link href="/collections" className="btn-outline">Collections</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--fg-subtle)' }}>
            <span>Est. 2026</span>
            <span className="h-px flex-1" style={{ background: 'var(--border-strong)' }} />
            <span>Made in India</span>
          </div>
        </div>

        {/* Image */}
        <div className="md:col-span-7 relative min-h-[56vh] md:min-h-0 order-1 md:order-2 md:border-l" style={{ borderColor: 'var(--border)' }}>
          <Image src={HERO_IMG} alt="WAR oversized tee — campaign" fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 58vw" />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 text-[10px] uppercase tracking-[0.24em]"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)', color: 'rgba(255,255,255,0.85)' }}>
            <span>Fig. 01 — The Oversized Tee</span>
            <span>WAR / 2026</span>
          </div>
        </div>
      </div>
    </section>
  );
}
