'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Plus } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { useCartStore } from '@/store/cartStore';
import { useIsInWishlist, useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';
import { isVariantAvailable } from '@/lib/stock';
import { formatPrice, cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
}

/** Editorial product tile: image first, quiet details, ink "quick add" on hover. */
export default function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const inWishlist = useIsInWishlist(product.product_id) && mounted;

  const images = product.images ?? [];
  const [hovered, setHovered] = useState(false);

  const availableVariant = product.variants?.find(isVariantAvailable);
  const isInStock = !!availableVariant;
  const hasDiscount = !!product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : null;
  const href = `/products/${product.slug}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(href)}`);
      return;
    }
    if (availableVariant) addItem(product, availableVariant, 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItem(product);
  };

  return (
    <div
      role="link"
      tabIndex={0}
      data-testid="product-card"
      onClick={() => router.push(href)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('group relative cursor-pointer', className)}
    >
      {/* Image */}
      <div className="relative aspect-[4/5] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {images.length === 0 && <ProductImage src="" alt={product.name} />}
        {images.slice(0, 2).map((img, i) => (
          <Image
            key={i}
            src={img.url}
            alt={i === 0 ? product.name : `${product.name} — alternate view`}
            fill
            className="object-cover transition-all duration-700 ease-out"
            style={{
              opacity: i === 0 ? (hovered && images.length > 1 ? 0 : 1) : (hovered ? 1 : 0),
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              filter: !isInStock ? 'grayscale(0.6)' : 'none',
            }}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ))}

        {/* Labels */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {!isInStock ? (
            <span className="text-[10px] px-2 py-1 font-semibold uppercase tracking-[0.16em]" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
              Sold out
            </span>
          ) : (
            <>
              {discountPercent && (
                <span className="text-[10px] px-2 py-1 font-semibold tracking-[0.1em]" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  −{discountPercent}%
                </span>
              )}
              {product.tags?.includes('new') && (
                <span className="text-[10px] px-2 py-1 font-semibold uppercase tracking-[0.16em]" style={{ background: 'var(--bg-card)', color: 'var(--fg)' }}>
                  New
                </span>
              )}
            </>
          )}
        </div>

        {/* Wishlist */}
        <button onClick={handleWishlist}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center transition-opacity"
          style={{ background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)' }}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}>
          <Heart size={14} style={{ color: inWishlist ? 'var(--accent)' : 'var(--fg)', fill: inWishlist ? 'var(--accent)' : 'none' }} />
        </button>

        {/* Quick add */}
        {isInStock && (
          <button onClick={handleAddToCart}
            className="absolute bottom-0 left-0 right-0 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 focus:translate-y-0 transition-transform duration-300"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
            <Plus size={13} /> Quick add{availableVariant?.size ? ` · ${availableVariant.size}` : ''}
          </button>
        )}
      </div>

      {/* Details */}
      <div className="pt-3.5 pb-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} onClick={(e) => e.stopPropagation()}
            className="text-[13px] leading-snug line-clamp-2" style={{ color: 'var(--fg)' }}>
            {product.name}
          </Link>
          <div className="text-right shrink-0">
            <span className="text-[13px] font-semibold" style={{ color: hasDiscount ? 'var(--accent)' : 'var(--fg)' }}>
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="block text-[11px] line-through" style={{ color: 'var(--fg-subtle)' }}>{formatPrice(product.compare_at_price!)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          {product.category ? (
            <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--fg-subtle)' }}>{product.category.name}</span>
          ) : <span />}
          {product.colors && product.colors.length > 1 && (
            <div className="flex items-center gap-1" aria-label={`${product.colors.length} colours`}>
              {product.colors.slice(0, 4).map((color, i) => (
                <span key={`${color.hex}-${i}`} className="w-2.5 h-2.5 rounded-full"
                  style={{ background: color.hex, boxShadow: 'inset 0 0 0 1px var(--border-strong)' }} title={color.name} />
              ))}
              {product.colors.length > 4 && <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>+{product.colors.length - 4}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
