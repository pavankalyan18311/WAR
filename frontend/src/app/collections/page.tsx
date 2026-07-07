import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COLLECTIONS } from '@/lib/mockData';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function CollectionsPage() {
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
        <ScrollReveal animation="fade-up">
          <Link
            href={`/collections/${COLLECTIONS[0].slug}`}
            className="block group relative rounded-3xl overflow-hidden mb-6"
            style={{ height: '480px', background: 'var(--bg-elevated)' }}
          >
            <Image
              src={COLLECTIONS[0].banner}
              alt={COLLECTIONS[0].name}
              fill className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="100vw" priority
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%)' }} />
            <div className="absolute inset-0 flex items-end p-10">
              <div>
                {COLLECTIONS[0].tag && (
                  <span className="inline-block text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full mb-4"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    {COLLECTIONS[0].tag}
                  </span>
                )}
                <h2 className="text-4xl font-black text-white mb-2">{COLLECTIONS[0].name}</h2>
                <p className="text-sm mb-5 max-w-md" style={{ color: 'rgba(255,255,255,0.75)' }}>{COLLECTIONS[0].description}</p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all group-hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)]"
                  style={{ background: '#fff', color: '#0a0a0a' }}>
                  Shop Now <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>
        </ScrollReveal>

        {/* Rest — 2 columns */}
        <div className="grid sm:grid-cols-2 gap-5">
          {COLLECTIONS.slice(1).map((col, i) => (
            <ScrollReveal key={col.id} animation="fade-up" delay={i * 100}>
              <Link
                href={`/collections/${col.slug}`}
                className="block group relative rounded-2xl overflow-hidden"
                style={{ height: '320px', background: 'var(--bg-elevated)' }}
              >
                <Image
                  src={col.thumbnail}
                  alt={col.name}
                  fill className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.1) 60%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {col.tag && (
                    <span className="inline-block text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full mb-3"
                      style={{ background: 'var(--accent)', color: '#fff' }}>
                      {col.tag}
                    </span>
                  )}
                  <h3 className="text-xl font-black text-white mb-1">{col.name}</h3>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{col.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {col.productCount} styles <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </main>
  );
}
