'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Star, Eye, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const inWishlist = mounted && isInWishlist(product.product_id);

  const defaultVariant = product.variants?.[0];
  const discountPercent =
    product.discount_price && product.price > product.discount_price
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (defaultVariant) addItem(product, defaultVariant, 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItem(product);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/products/${product.slug}`);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/products/${product.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${product.slug}`)}
      className={cn('group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1', className)}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-lg)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <Image
          src={product.images[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'}
          alt={product.name} fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discountPercent && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'var(--danger)', color: '#fff' }}>
              -{discountPercent}%
            </span>
          )}
          {!product.is_in_stock && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
              Sold Out
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button onClick={handleWishlist}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{
              background: inWishlist ? 'var(--danger)' : 'var(--bg-card)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)',
            }}
            aria-label="Toggle wishlist">
            <Heart size={14} style={{ color: inWishlist ? '#fff' : 'var(--fg-muted)', fill: inWishlist ? '#fff' : 'none' }} />
          </button>
          <button onClick={handleQuickView}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
            style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}
            aria-label="Quick view">
            <Eye size={14} style={{ color: 'var(--fg-muted)' }} />
          </button>
        </div>

        {/* Quick Add overlay */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <button onClick={handleAddToCart}
            disabled={!product.is_in_stock || !defaultVariant}
            className="w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <ShoppingBag size={13} />
            {product.is_in_stock ? 'Quick Add' : 'Out of Stock'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {product.category && (
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
            {product.category.name}
          </p>
        )}

        <Link href={`/products/${product.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold leading-tight line-clamp-2 hover:underline"
          style={{ color: 'var(--fg)' }}>
          {product.name}
        </Link>

        {product.rating && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-muted)' }}>
              {product.rating}
            </span>
            {product.review_count && (
              <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>({product.review_count})</span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-2">
          {product.discount_price && product.discount_price < product.price ? (
            <>
              <span className="text-sm font-black" style={{ color: 'var(--fg)' }}>{formatPrice(product.discount_price)}</span>
              <span className="text-xs line-through" style={{ color: 'var(--fg-subtle)' }}>{formatPrice(product.price)}</span>
            </>
          ) : (
            <span className="text-sm font-black" style={{ color: 'var(--fg)' }}>{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
