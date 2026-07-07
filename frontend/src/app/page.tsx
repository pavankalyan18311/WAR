import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Shield, RotateCcw, Truck, CreditCard, ArrowRight } from 'lucide-react';
import { MOCK_PRODUCTS, getBestSellers } from '@/lib/mockData';
import NewsletterForm from '@/components/home/NewsletterForm';
import { HeroSkeleton } from '@/components/ui/Skeleton';
import { formatPrice } from '@/lib/utils';

const HeroVideoBanner = dynamic(() => import('@/components/home/HeroVideoBanner'), {
  loading: () => <HeroSkeleton />,
});

const FEATURES = [
  { icon: Shield, label: 'Premium 240+ GSM', desc: 'Heavyweight cotton built to last' },
  { icon: RotateCcw, label: 'Oversized Streetwear Fit', desc: 'Relaxed, dropped-shoulder silhouette' },
  { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹999' },
  { icon: RotateCcw, label: 'Easy Returns', desc: '7 Day hassle-free returns' },
  { icon: CreditCard, label: 'Made For Everyday', desc: 'Designed for comfort and confidence' },
];



// Removed social-proof stats (50K+ / 200+ / Avg Delivery) per product direction

export default function HomePage() {
  const featured = MOCK_PRODUCTS.slice(0, 4);
  const bestSellers = getBestSellers();

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

      {/* Stats/trust bar removed per product direction */}

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
              <Link key={p.product_id} href={`/products/${p.slug}`} className="block rounded-md overflow-hidden" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
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
      <section className="py-10" style={{ background: '#f3f3f3' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 pr-2">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-2" style={{ color: '#2b2b2b' }}>Best Sellers</p>
            <h2 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: '#111' }}>
              Our Community
              <br />
              Favorites.
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b' }}>
              The oversized essentials our customers keep coming back for.
            </p>
            <Link href="/products?sort=popular" className="inline-flex items-center gap-2 mt-8 text-sm font-bold uppercase tracking-[0.08em]" style={{ color: '#111' }}>
              View All Best Sellers <ArrowRight size={14} />
            </Link>
          </div>

          <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {bestSellers.map((p) => (
              <Link key={p.product_id} href={`/products/${p.slug}`} className="block rounded-md overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="relative aspect-[3/4]">
                  <Image src={p.images?.[0]?.url ?? 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'} alt={p.name} fill className="object-cover" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs sm:text-sm font-semibold line-clamp-1" style={{ color: '#111' }}>{p.name}</p>
                  <p className="mt-1 text-base font-black" style={{ color: '#111' }}>{formatPrice(p.discount_price ?? p.price)}</p>
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

      {/* ── REVIEWS ─────────────────────────────────────── */}
      <section className="py-10" style={{ background: '#0B0B0B' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-2" style={{ color: '#d4d4d4' }}>Love from the Community</p>
            <h3 className="text-4xl font-extrabold leading-tight" style={{ color: '#fff' }}>
              Real People.
              <br />
              Real Reviews.
            </h3>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              'The fit is perfect. True oversized and the quality is insane!',
              'Finally a brand that gets oversized right. 10/10 recommend.',
              'Premium fabric, dope prints and super comfortable. My go-to brand now.',
            ].map((quote, i) => (
              <div key={i} className="p-4 rounded-md" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs mb-3" style={{ color: '#f5c045' }}>★★★★★</p>
                <p className="text-sm leading-relaxed" style={{ color: '#e5e5e5' }}>{quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER (JOIN THE WAR TRIBE) ───────────────────────────────────────── */}
      <section className="py-9" style={{ background: '#0B0B0B', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-xl md:text-2xl font-extrabold mb-5" style={{ color: '#fff' }}>GET 10% OFF YOUR FIRST ORDER</p>
          <div className="max-w-3xl">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </main>
  );
}

