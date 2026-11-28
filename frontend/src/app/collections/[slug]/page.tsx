import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCollections, getProducts } from '@/lib/supabase/queries';
import ProductCard from '@/components/product/ProductCard';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ShippingNote from '@/components/ui/ShippingNote';

// Collections are edited in admin — always render from live data (never a build-time snapshot).
export const dynamic = 'force-dynamic';

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const resolvedParams = typeof (params as any)?.then === 'function' ? await (params as Promise<{ slug: string }>) : (params as { slug: string });
  const slug = resolvedParams?.slug;

  const collections = await getCollections();
  const collection = (collections || []).find((c: any) => c.slug === slug);

  if (!collection) {
    notFound();
  }

  const allProducts = await getProducts();
  // Membership is set by the admin (product_collections), never guessed from names.
  const displayProducts = allProducts.filter((p: any) => p.collection_ids?.includes(collection.id));

  return (
    <main className="ui-page w-full">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-8 pb-20">
        {/* Header: statement + cover */}
        <section className="ui-card overflow-hidden grid md:grid-cols-12">
          <div className="md:col-span-5 px-5 sm:px-8 py-8 md:py-12 flex flex-col justify-between gap-8 order-2 md:order-1">
            <Link href="/collections" className="ui-link inline-flex items-center gap-2 text-sm self-start">
              <ArrowLeft size={15} /> All Collections
            </Link>
            <div>
              <span className="ui-chip ui-chip-brand mb-4">The collection</span>
              <h1 className="ui-heading leading-[1.02]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>{collection.name}</h1>
              {collection.description && (
                <p className="text-[15px] leading-relaxed mt-4 max-w-md" style={{ color: 'var(--fg-muted)' }}>{collection.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="ui-chip ui-chip-brand">{displayProducts.length} products</span>
              <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}><ShippingNote /></span>
            </div>
          </div>
          <div className="md:col-span-7 relative min-h-[280px] md:min-h-[440px] order-1 md:order-2 overflow-hidden"
            style={{ background: 'var(--brand-soft)' }}>
            {collection.image_url ? (
              <Image src={collection.image_url} alt={collection.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 58vw" priority />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center ui-heading text-5xl px-8 text-center" style={{ color: 'var(--brand)' }}>
                {collection.name}
              </div>
            )}
          </div>
        </section>

        {/* Products */}
        <div className="mt-10">
          {displayProducts.length === 0 ? (
            <div className="ui-card text-center py-16 px-6">
              <span className="ui-chip ui-chip-brand mb-4">Coming soon</span>
              <p className="ui-heading text-2xl sm:text-3xl mb-3">No products in this collection yet</p>
              <p className="text-[15px] mb-8" style={{ color: 'var(--fg-muted)' }}>Check back soon — new drops coming.</p>
              <Link href="/products" className="ui-btn">Shop All Products</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-10">
              {displayProducts.map((product: any, i: number) => (
                <ScrollReveal key={product.product_id} animation="fade-up" delay={(i % 4) * 60}>
                  <ProductCard product={product} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
