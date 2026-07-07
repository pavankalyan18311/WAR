'use client';

import Link from 'next/link';
import Image from 'next/image';

const HERO_IMG = '/images/Hero_banner.png';

export default function HeroVideoBanner() {
  return (
    <section className="relative w-full min-h-[78vh] md:min-h-[86vh] overflow-hidden" aria-label="Hero banner">
      <Image
        src={HERO_IMG}
        alt="WAR oversized hero"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.45) 100%)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-24 md:pt-32 pb-20 md:pb-24">
        <div className="max-w-xl">
          <p className="text-sm font-bold tracking-[0.18em] uppercase mb-5" style={{ color: '#d4d4d4' }}>
            Oversized. Always.
          </p>

          <h1 className="font-black leading-[0.92] text-white" style={{ fontSize: 'clamp(3rem, 8vw, 6.8rem)', letterSpacing: '-0.02em' }}>
            WEAR THE
            <br />
            WAR
          </h1>

          <p className="mt-5 text-base sm:text-lg leading-relaxed" style={{ color: '#c7c7c7', maxWidth: 520 }}>
            Premium heavyweight oversized t-shirts crafted for comfort. Built for expression.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/products?category=oversized"
              data-testid="hero-shop-cta"
              className="inline-flex items-center justify-center px-7 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-[0.08em]"
              style={{ background: '#ffffff', color: '#111111' }}
            >
              Shop Oversized
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-7 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-[0.08em]"
              style={{ border: '1px solid rgba(255,255,255,0.42)', color: '#ffffff', background: 'transparent' }}
            >
              New Drops
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
