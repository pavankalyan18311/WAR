import Link from 'next/link';
import Image from 'next/image';
import { Shield, RotateCcw, Truck, CreditCard, Sparkles, Camera, Ruler, ArrowRight, Star, TrendingUp, Award } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { MOCK_PRODUCTS, CATEGORIES, getBestSellers } from '@/lib/mockData';
import NewsletterForm from '@/components/home/NewsletterForm';

const FEATURES = [
  { icon: Shield, label: 'Premium Quality', desc: 'Finest Fabrics & Craftsmanship' },
  { icon: RotateCcw, label: '7 Day Returns', desc: 'No Questions Asked' },
  { icon: Truck, label: 'Free Shipping', desc: 'On Orders Above Rs.999' },
  { icon: CreditCard, label: 'Secure Payments', desc: '100% Safe & Encrypted' },
];

const AI_FEATURES = [
  {
    icon: Camera,
    title: 'Virtual Try-On',
    description: 'See exactly how the t-shirt looks on you before buying. Upload your photo and visualise the fit in seconds.',
    href: '/try-on',
    badge: 'New',
  },
  {
    icon: Ruler,
    title: 'AI Size Recommendation',
    description: 'Get your perfect size based on your measurements. Our ML model predicts the best fit with 95% accuracy.',
    href: '/size-guide',
    badge: 'Popular',
  },
  {
    icon: Sparkles,
    title: 'Personal Stylist AI',
    description: 'Chat with our AI assistant to discover products matching your style, budget, and occasion.',
    href: '/#chatbot',
    badge: 'AI',
  },
];

const STATS = [
  { value: '50K+', label: 'Happy Customers', icon: Star },
  { value: '200+', label: 'Premium Styles', icon: Award },
  { value: '4.9 Stars', label: 'Average Rating', icon: TrendingUp },
  { value: '3 Days', label: 'Avg Delivery', icon: Truck },
];

export default function HomePage() {
  const featured = MOCK_PRODUCTS.slice(0, 4);
  const bestSellers = getBestSellers();

  return (
    <main>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: '#0a0a0a' }}>
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1800"
            alt="Hero" fill className="object-cover" style={{ opacity: 0.35 }}
            priority sizes="100vw"
          />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.5) 100%)' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold tracking-widest uppercase"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              New Collection 2026
            </div>
            <h1 className="font-black leading-[1.02] mb-6 text-white" style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}>
              PREMIUM<br />
              <span style={{ color: '#d1d5db' }}>COMFORT.</span><br />
              TIMELESS<br />
              <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                STYLE.
              </span>
            </h1>
            <p style={{ color: '#9ca3af' }} className="text-base sm:text-lg mb-8 leading-relaxed max-w-md">
              High-quality fabrics meet AI precision. Perfect fit, every time. Made for the modern man.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/products"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: '#fff', color: '#111' }}>
                Shop Collection <ArrowRight size={15} />
              </Link>
              <Link href="/try-on"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm uppercase tracking-wider transition-all"
                style={{ border: '2px solid rgba(255,255,255,0.4)', color: '#fff' }}>
                <Camera size={15} /> Virtual Try-On
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <div className="w-px h-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4))' }} />
          <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderLeft: '1px solid var(--border)' }}>
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

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="py-14" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <Icon size={18} style={{ color: 'var(--fg-muted)' }} />
                </div>
                <p className="text-2xl sm:text-3xl font-black mb-1" style={{ color: 'var(--fg)' }}>{value}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Browse</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>Shop by Category</h2>
          </div>
          <Link href="/products" className="text-sm font-semibold flex items-center gap-1.5 hover:opacity-70"
            style={{ color: 'var(--fg-muted)' }}>
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {CATEGORIES.map((cat, i) => {
            const imgs = [
              'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
              'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
              'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400',
              'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=400',
              'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400',
            ];
            return (
              <Link key={cat.id} href={`/products?category=${cat.slug}`}
                className="group relative rounded-2xl overflow-hidden aspect-[3/4]"
                style={{ background: 'var(--bg-elevated)' }}>
                <Image src={imgs[i]} alt={cat.name} fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 20vw" />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="font-bold text-sm uppercase tracking-wide">{cat.name}</p>
                  <p className="text-xs" style={{ color: '#d1d5db' }}>{cat.itemCount} styles</p>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <span className="text-white text-xs font-bold px-4 py-2 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}>
                    Explore
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── NEW ARRIVALS ─────────────────────────────────────── */}
      <section className="py-16" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Just Dropped</p>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>New Arrivals</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>Fresh drops from our latest collection.</p>
            </div>
            <Link href="/products" className="text-sm font-semibold flex items-center gap-1.5 hover:opacity-70"
              style={{ color: 'var(--fg-muted)' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {featured.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── AI FEATURES ──────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--accent)' }}>Powered by AI</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: 'var(--fg)' }}>Shop Smarter</h2>
          <p className="max-w-md mx-auto text-sm" style={{ color: 'var(--fg-muted)' }}>
            AI-powered tools to eliminate doubt. See it, size it, style it before you buy.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {AI_FEATURES.map(({ icon: Icon, title, description, href, badge }) => (
            <Link key={title} href={href}
              className="group relative rounded-2xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <Icon size={22} style={{ color: 'var(--fg)' }} />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  {badge}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--fg)' }}>{title}</h3>
              <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>
              <p className="text-sm font-bold mt-5 flex items-center gap-1.5 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--accent)' }}>
                Try Now <ArrowRight size={13} />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── BEST SELLERS ─────────────────────────────────────── */}
      <section className="py-16" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Fan Favourites</p>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>Best Sellers</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>Loved by thousands of customers.</p>
            </div>
            <Link href="/products?sort=popular" className="text-sm font-semibold flex items-center gap-1.5 hover:opacity-70"
              style={{ color: 'var(--fg-muted)' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {bestSellers.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ───────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--primary)' }}>
        <div className="max-w-2xl mx-auto px-5 text-center">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4 opacity-60" style={{ color: 'var(--primary-fg)' }}>
            Exclusive Access
          </p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: 'var(--primary-fg)' }}>Join the Tribe</h2>
          <p className="text-sm leading-relaxed mb-8 opacity-70" style={{ color: 'var(--primary-fg)' }}>
            Get 10% off your first order. Plus exclusive drops, style tips, and early access to new collections.
          </p>
          <NewsletterForm />
          <p className="text-[11px] mt-4 opacity-40" style={{ color: 'var(--primary-fg)' }}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>
    </main>
  );
}
