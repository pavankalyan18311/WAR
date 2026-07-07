import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { COLLECTIONS, getCollectionBySlug, getProductsForCollection } from '@/lib/mockData';
import ProductCard from '@/components/product/ProductCard';
import ScrollReveal from '@/components/ui/ScrollReveal';

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  const products = getProductsForCollection(collection);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Banner */}
      <div className="relative h-[360px] sm:h-[480px] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <Image
          src={collection.banner}
          alt={collection.name}
          fill className="object-cover"
          sizes="100vw" priority
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-end max-w-7xl mx-auto px-5 sm:px-8 pb-12">
          <Link href="/collections"
            className="inline-flex items-center gap-1.5 text-xs font-semibold mb-6 hover:opacity-70 transition-opacity"
            style={{ color: 'rgba(255,255,255,0.75)' }}>
            <ArrowLeft size={13} /> All Collections
          </Link>
          {collection.tag && (
            <span className="inline-block text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full mb-4 w-fit"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              {collection.tag}
            </span>
          )}
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
            {collection.name}
          </h1>
          <p className="text-sm max-w-xl" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {collection.longDescription}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-6 text-sm">
          <span style={{ color: 'var(--fg-muted)' }}>
            <strong style={{ color: 'var(--fg)' }}>{products.length}</strong> products
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ color: 'var(--fg-muted)' }}>Free shipping on orders above ₹999</span>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--fg)' }}>No products in this collection yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>Check back soon — new drops coming.</p>
            <Link href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Shop All Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {products.map((product, i) => (
              <ScrollReveal key={product.product_id} animation="fade-up" delay={i * 60}>
                <ProductCard product={product} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
