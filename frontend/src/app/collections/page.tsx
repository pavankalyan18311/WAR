import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCollections } from '@/lib/supabase/queries';

// Collections are edited in admin — always render from live data (never a build-time snapshot).
export const dynamic = 'force-dynamic';

const num = (i: number) => String(i + 1).padStart(2, '0');

function Cover({ src, alt, index, sizes, priority }: { src?: string | null; alt: string; index: number; sizes: string; priority?: boolean }) {
  return src ? (
    <Image src={src} alt={alt} fill priority={priority} sizes={sizes}
      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center ui-heading text-7xl" style={{ color: 'var(--brand)', background: 'var(--brand-soft)' }}>
      {num(index)}
    </div>
  );
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  if (!collections || collections.length === 0) {
    return (
      <main className="ui-page w-full">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="ui-card px-6 py-14 text-center">
            <span className="ui-chip ui-chip-brand mb-4">Curated edits</span>
            <h1 className="ui-heading mb-3" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', lineHeight: 1.05 }}>Collections</h1>
            <p className="text-[15px] mb-8" style={{ color: 'var(--fg-muted)' }}>No collections found at the moment.</p>
            <Link href="/products" className="ui-btn">Shop All Products</Link>
          </div>
        </div>
      </main>
    );
  }

  const [featured, ...rest] = collections;

  return (
    <main className="ui-page w-full">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-8 pb-20">
        <header className="ui-card px-5 sm:px-8 py-7 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <span className="ui-chip ui-chip-brand mb-3">Curated edits</span>
            <h1 className="ui-heading" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', lineHeight: 1.02 }}>Collections</h1>
          </div>
          <p className="text-[15px] max-w-sm" style={{ color: 'var(--fg-muted)' }}>
            Thoughtfully curated groups of styles — each collection tells a story. Find yours.
          </p>
        </header>

        {/* Featured */}
        <Link href={`/collections/${featured.slug}`} className="group ui-card overflow-hidden grid md:grid-cols-12">
          <div className="md:col-span-7 relative aspect-[4/3] md:aspect-auto md:min-h-[440px] overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <Cover src={featured.image_url} alt={featured.name} index={0} sizes="(max-width: 768px) 100vw, 58vw" priority />
          </div>
          <div className="md:col-span-5 p-6 sm:p-10 flex flex-col justify-between gap-8">
            <span className="ui-chip ui-chip-brand self-start">01 — Featured edit</span>
            <div>
              <h2 className="ui-heading leading-[1.02] mb-3" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 3rem)' }}>{featured.name}</h2>
              {featured.description && <p className="text-[15px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{featured.description}</p>}
            </div>
            <span className="ui-btn self-start">
              Shop Collection <ArrowRight size={15} />
            </span>
          </div>
        </Link>

        {/* The rest */}
        {rest.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {rest.map((col: any, i: number) => (
              <Link key={col.id} href={`/collections/${col.slug}`} className="group ui-card overflow-hidden block transition-transform hover:-translate-y-0.5">
                <div className="relative aspect-[4/5] overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  <Cover src={col.image_url} alt={col.name} index={i + 1} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  <span className="ui-chip absolute top-3 left-3" style={{ background: 'var(--surface)', color: 'var(--fg)' }}>{num(i + 1)}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="ui-heading text-xl">{col.name}</h3>
                    <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-fg)]"
                      style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }} aria-hidden>
                      <ArrowRight size={16} />
                    </span>
                  </div>
                  {col.description && <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{col.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
