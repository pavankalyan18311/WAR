'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

  const images = product.images?.length ? product.images : [{ url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' }];
  const [activeIdx, setActiveIdx] = useState(0);
  const [fadingIdx, setFadingIdx] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSlideshow = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
    if (images.length <= 1) return;
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % images.length;
      setFadingIdx(idx);
      setTimeout(() => {
        setActiveIdx(idx);
        setFadingIdx(null);
      }, 200);
    }, 800);
  }, [images.length]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
    stopSlideshow();
    setFadingIdx(0);
    setTimeout(() => {
      setActiveIdx(0);
      setFadingIdx(null);
    }, 200);
  }, [stopSlideshow]);

  useEffect(() => () => stopSlideshow(), [stopSlideshow]);

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
      data-testid="product-card"
      onClick={() => router.push(`/products/${product.slug}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/products/${product.slug}`)}
      className={cn('group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1', className)}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {/* Preload all images, show active one */}
        {images.map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={`${product.name} view ${i + 1}`}
            fill
            className="object-cover transition-all duration-200"
            style={{
              opacity: fadingIdx === i ? 0 : activeIdx === i ? 1 : 0,
              transform: activeIdx === i ? 'scale(1.05)' : 'scale(1)',
            }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={i === 0}
          />
        ))}
        {/* Dot indicators — only show if multiple images */}
        {images.length > 1 && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: activeIdx === i ? 16 : 6,
                  height: 6,
                  background: activeIdx === i ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                }}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discountPercent && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'var(--danger)', color: '#fff' }}>
              -{discountPercent}%
            </span>
          )}
          {product.tags?.includes('new') && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: '#22c55e', color: '#fff' }}>
              New Arrival
            </span>
          )}
          {(product.tags?.includes('bestseller') || product.is_featured) && !product.tags?.includes('new') && (
            <span className="text-xs px-2.5 py-1 rounded-full font-bold"
              style={{ background: '#f59e0b', color: '#fff' }}>
              Best Seller
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

        {/* Color swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5">
            {product.colors.slice(0, 6).map((color, i) => (
              <span
                key={`${color.hex}-${i}`}
                className="w-4 h-4 rounded-full border"
                style={{
                  background: color.hex,
                  borderColor: 'var(--border)',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }}
                title={color.name}
              />
            ))}
            {product.colors.length > 6 && (
              <span className="text-[10px] font-semibold" style={{ color: 'var(--fg-muted)' }}>+{product.colors.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
