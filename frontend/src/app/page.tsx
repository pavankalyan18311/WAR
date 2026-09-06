import Link from 'next/link';
import Image from 'next/image';
import { Shield, RotateCcw, Truck, CreditCard, ArrowRight } from 'lucide-react';
import { getProducts } from '@/lib/supabase/queries';
import { formatPrice } from '@/lib/utils';
import HeroVideoBanner from '@/components/home/HeroVideoBanner';

const FEATURES = [
  { icon: Shield, label: 'Premium 240+ GSM', desc: 'Heavyweight cotton built to last' },
  { icon: RotateCcw, label: 'Oversized Streetwear Fit', desc: 'Relaxed, dropped-shoulder silhouette' },
  { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹999' },
  { icon: RotateCcw, label: 'Easy Returns', desc: '7 Day hassle-free returns' },
  { icon: CreditCard, label: 'Made For Everyday', desc: 'Designed for comfort and confidence' },
];

export default async function HomePage() {
  const allProducts = await getProducts({ limit: 8 });
  const featured = allProducts.slice(0, 4);
  const bestSellers = allProducts.slice(4, 8).length > 0 ? allProducts.slice(4, 8) : featured;

  return (
    <main>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <HeroVideoBanner />

      {/* ── TRUST BAR ────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5" style={{ borderLeft: '1px solid var(--border)' }}>
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-5" style={{ borderRight: '1px solid var(--border)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <Icon size={18} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEW DROPS ─────────────────────────────────────── */}
      <section className="py-10" style={{ background: '#0B0B0B' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 pr-2">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-2" style={{ color: '#d4d4d4' }}>New Drops</p>
            <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: '#fff' }}>
              Fresh Drops.
              <br />
              Every Week.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#b3b3b3' }}>
              New oversized t-shirts designed for the streets. Don&apos;t miss out.
            </p>
            <Link href="/products" className="inline-flex items-center gap-2 mt-8 text-sm font-bold uppercase tracking-[0.08em]" style={{ color: '#fff' }}>
              View All New Drops <ArrowRight size={14} />
            </Link>
          </div>

          <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {featured.map((p) => (
              <Link key={p.product_id || p.id} href={`/products/${p.slug}`} className="block rounded-md overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="relative aspect-[3/4]">
                  <Image src={p.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'} alt={p.name} fill className="object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs sm:text-sm font-semibold line-clamp-1" style={{ color: '#fff' }}>{p.name}</p>
                  <p className="mt-1 text-base font-black" style={{ color: '#fff' }}>{formatPrice(p.discount_price ?? p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEST SELLERS STRIP ─────────────────────────────────────── */}
      <section className="py-10" style={{ background: '#121212', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 pr-2">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-2" style={{ color: '#d4d4d4' }}>MOST WANTED</p>
            <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: '#fff' }}>
              Best-Selling
              <br />
              Essentials.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#b3b3b3' }}>
              The oversized essentials our community keeps coming back for.
            </p>
            <Link href="/products?sort=popular" className="inline-flex items-center gap-2 mt-8 text-sm font-bold uppercase tracking-[0.08em]" style={{ color: '#fff' }}>
              View All Best Sellers <ArrowRight size={14} />
            </Link>
          </div>

          <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {bestSellers.map((p) => (
              <Link key={p.product_id || p.id} href={`/products/${p.slug}`} className="block rounded-md overflow-hidden group transition-all" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="relative aspect-[3/4]">
                  <Image src={p.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs sm:text-sm font-semibold line-clamp-1" style={{ color: '#fff' }}>{p.name}</p>
                  <p className="mt-1 text-base font-black" style={{ color: '#fff' }}>{formatPrice(p.discount_price ?? p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRAND BAND ─────────────────────────────────────── */}
      <section className="relative h-[230px] md:h-[280px] overflow-hidden">
        <Image src={'/images/full-width-brand.png'} alt="WAR crew" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.30) 65%, rgba(0,0,0,0.25) 100%)' }} />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-5 sm:px-8 flex items-center">
          <div>
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-2" style={{ color: '#d4d4d4' }}>Made for the Streets</p>
            <h3 className="text-4xl md:text-5xl font-extrabold leading-tight" style={{ color: '#fff' }}>
              Not just a tee.
              <br />
              It&apos;s an attitude.
            </h3>
            <Link href="/products?category=oversized" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.08em]" style={{ border: '1px solid rgba(255,255,255,0.45)', color: '#fff' }}>
              Explore Collection <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
