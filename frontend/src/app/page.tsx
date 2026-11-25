import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getBestSellers, getCollections, getProducts } from '@/lib/supabase/queries';
import type { Product } from '@/types';
import HeroVideoBanner from '@/components/home/HeroVideoBanner';
import NewsletterForm from '@/components/home/NewsletterForm';
import ProductCard from '@/components/product/ProductCard';
import Marquee from '@/components/home/Marquee';
import InstagramReels from '@/components/home/InstagramReels';
import { DEFAULT_MARQUEE, loadHomeContent } from '@/lib/homeContent';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import ScrollReveal from '@/components/ui/ScrollReveal';


/** "01 — New in" style heading used by every home section. */
function SectionHead({ index, title, href, cta }: { index: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-6 pb-6 mb-8 border-b" style={{ borderColor: 'var(--border-strong)' }}>
      <div>
        <p className="eyebrow mb-3">{index}</p>
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1 }}>{title}</h2>
      </div>
      {href && (
        <Link href={href} className="link-rule text-[11px] font-semibold uppercase tracking-[0.2em] whitespace-nowrap inline-flex items-center gap-2">
          {cta} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

// Banner and reels are edited in Admin → Homepage — always show the latest.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [newIn, bestSellers, collections, home] = await Promise.all([
    getProducts({ limit: 8 }) as Promise<Product[]>,
    getBestSellers(4) as Promise<Product[]>,
    getCollections() as Promise<any[]>,
    loadHomeContent(getServiceClient()).catch(() => ({ marquee: DEFAULT_MARQUEE, instagramUrl: null, reels: [] })),
  ]);

  return (
    <main>
      <HeroVideoBanner />

      {/* Scrolling banner — text and colours from Admin → Homepage */}
      <Marquee settings={home.marquee} />

      {/* 01 — New in */}
      {newIn.length > 0 && (
        <ScrollReveal as="section" className="w-full max-w-7xl mx-auto px-5 sm:px-8 py-20">
          <SectionHead index="01 — New in" title="The latest drop" href="/products?sort=newest" cta="Shop all new" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
            {newIn.map((p) => <ProductCard key={p.product_id} product={p} />)}
          </div>
        </ScrollReveal>
      )}

      {/* 02 — Brand statement */}
      <ScrollReveal as="section" style={{ background: '#161412', color: '#F5F2EC' }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2">
          <div className="relative min-h-[320px] md:min-h-[480px]">
            <Image src="/images/full-width-brand.png" alt="WAR crew wearing oversized tees" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <div className="px-6 sm:px-12 py-16 flex flex-col justify-center">
            <p className="eyebrow mb-6" style={{ color: 'rgba(245,242,236,0.6)' }}>02 — The idea</p>
            <blockquote className="font-display leading-[1.1]" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 3rem)' }}>
              &ldquo;Not just a tee. A decision to wear what you mean —{' '}
              <em style={{ color: '#D9776F' }}>without any regrets.</em>&rdquo;
            </blockquote>
            <Link href="/products" className="mt-10 self-start text-[11px] font-semibold uppercase tracking-[0.2em] inline-flex items-center gap-2 border-b pb-1"
              style={{ borderColor: 'rgba(245,242,236,0.5)' }}>
              Explore the range <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </ScrollReveal>

      {/* 03 — Collections */}
      {collections.length > 0 && (
        <ScrollReveal as="section" className="w-full max-w-7xl mx-auto px-5 sm:px-8 py-20">
          <SectionHead index="03 — Collections" title="Shop by edit" href="/collections" cta="All collections" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.slice(0, 3).map((c: any, i: number) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" sizes="(max-width: 1024px) 50vw, 33vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center font-display text-7xl" style={{ color: 'var(--fg-subtle)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  )}
                </div>
                <div className="flex items-baseline justify-between mt-4">
                  <h3 className="text-2xl">{c.name}</h3>
                  <span className="text-[11px] uppercase tracking-[0.2em] link-rule">Shop</span>
                </div>
                {c.description && <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{c.description}</p>}
              </Link>
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* 04 — Best sellers (only when there are real sales) */}
      {bestSellers.length > 0 && (
        <ScrollReveal as="section" className={`w-full max-w-7xl mx-auto px-5 sm:px-8 ${collections.length > 0 ? 'pb-20' : 'py-20'}`}>
          <SectionHead index="04 — Most wanted" title="Best sellers" href="/products?sort=popular" cta="Shop best sellers" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
            {bestSellers.map((p) => <ProductCard key={p.product_id} product={p} />)}
          </div>
        </ScrollReveal>
      )}

      {/* Instagram reels — managed in Admin → Homepage (hidden until reels are added) */}
      <InstagramReels reels={home.reels} instagramUrl={home.instagramUrl} />

      {/* Newsletter */}
      <ScrollReveal as="section" style={{ background: '#161412', color: '#F5F2EC' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 grid md:grid-cols-2 gap-10 items-end">
          <div>
            <p className="eyebrow mb-4" style={{ color: 'rgba(245,242,236,0.6)' }}>Letters from WAR</p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1.02 }}>
              First word on every <em style={{ color: '#D9776F' }}>drop.</em>
            </h2>
            <p className="mt-4 text-sm max-w-md" style={{ color: 'rgba(245,242,236,0.65)' }}>
              New releases and restocks, straight to your inbox. No spam — unsubscribe any time.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </ScrollReveal>
    </main>
  );
}
