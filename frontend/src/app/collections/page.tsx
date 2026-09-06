import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCollections, getProducts } from '@/lib/supabase/queries';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default async function CollectionsPage() {
  const collections = await getCollections();

  if (!collections || collections.length === 0) {
    return (
      <main className="min-h-screen py-24 text-center" style={{ background: 'var(--bg)' }}>
        <div className="max-w-md mx-auto px-5">
          <h1 className="text-3xl font-black mb-3" style={{ color: 'var(--fg)' }}>Collections</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>No collections found at the moment.</p>
          <Link href="/products" className="px-6 py-3 rounded-full text-xs font-extrabold uppercase" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            Shop All Products
          </Link>
        </div>
      </main>
    );
  }

  const featured = collections[0];
  const rest = collections.slice(1);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
          <ScrollReveal animation="fade-up">
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>
              Curated For You
            </p>
            <h1 className="text-3xl sm:text-5xl font-black" style={{ color: 'var(--fg)' }}>Collections</h1>
            <p className="mt-3 text-sm max-w-md" style={{ color: 'var(--fg-muted)' }}>
              Thoughtfully curated groups of styles — each collection tells a story. Find yours.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        {/* Featured — first collection large */}
        {featured && (
          <ScrollReveal animation="fade-up">
            <Link
              href={`/collections/${featured.slug}`}
              className="block group relative rounded-3xl overflow-hidden mb-6"
              style={{ height: '480px', background: 'var(--bg-elevated)' }}
            >
              <Image
                src={featured.banner_url || featured.image_url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200'}
                alt={featured.name}
                fill className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="100vw" priority
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%)' }} />
              <div className="absolute inset-0 flex items-end p-10">
                <div>
                  <h2 className="text-4xl font-black text-white mb-2">{featured.name}</h2>
                  {featured.description && (
                    <p className="text-sm mb-5 max-w-md" style={{ color: 'rgba(255,255,255,0.75)' }}>{featured.description}</p>
                  )}
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all group-hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)]"
                    style={{ background: '#fff', color: '#0a0a0a' }}>
                    Shop Collection <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </ScrollReveal>
        )}

        {/* Rest — 2 columns */}
        {rest.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-5">
            {rest.map((col: any, i: number) => (
              <ScrollReveal key={col.id} animation="fade-up" delay={i * 100}>
                <Link
                  href={`/collections/${col.slug}`}
                  className="block group relative rounded-2xl overflow-hidden"
                  style={{ height: '320px', background: 'var(--bg-elevated)' }}
                >
                  <Image
                    src={col.image_url || col.banner_url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'}
                    alt={col.name}
                    fill className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.1) 60%)' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-black text-white mb-1">{col.name}</h3>
                    {col.description && (
                      <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{col.description}</p>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.9)' }}>
                      Explore Collection <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
