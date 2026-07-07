'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Trash2, ArrowRight, Star } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import type { WishlistItem } from '@/types';

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const addCartItem = useCartStore((s) => s.addItem);

  const handleMoveToCart = (item: WishlistItem) => {
    const defaultVariant = item.product.variants?.[0];
    if (defaultVariant) {
      addCartItem(item.product, defaultVariant, 1);
      removeItem(item.product.product_id);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--fg)' }}>
                My Wishlist
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                {items.length === 0 ? 'No saved items' : `${items.length} item${items.length !== 1 ? 's' : ''} saved`}
              </p>
            </div>
            <Heart
              size={28}
              style={{ color: items.length > 0 ? 'var(--danger)' : 'var(--fg-subtle)', fill: items.length > 0 ? 'var(--danger)' : 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <Heart size={40} style={{ color: 'var(--fg-subtle)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Your wishlist is empty</h2>
            <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--fg-muted)' }}>
              Save items you love and come back to them anytime.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              Browse Products <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => {
              const { product } = item;
              const discountPercent =
                product.discount_price && product.price > product.discount_price
                  ? Math.round(((product.price - product.discount_price) / product.price) * 100)
                  : null;
              const defaultVariant = product.variants?.[0];
              const imgSrc = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600';

              return (
                <div
                  key={item.wishlist_item_id}
                  className="rounded-2xl overflow-hidden group"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Image */}
                  <Link href={`/products/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                    <Image
                      src={imgSrc}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {discountPercent && (
                      <span
                        className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-bold"
                        style={{ background: 'var(--danger)', color: '#fff' }}
                      >
                        -{discountPercent}%
                      </span>
                    )}
                    {!product.is_in_stock && (
                      <span
                        className="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-bold"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}
                      >
                        Sold Out
                      </span>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    {product.category && (
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--accent)' }}>
                        {product.category.name}
                      </p>
                    )}
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-sm font-semibold leading-tight line-clamp-2 hover:underline block mb-2"
                      style={{ color: 'var(--fg)' }}
                    >
                      {product.name}
                    </Link>

                    {product.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-muted)' }}>{product.rating}</span>
                        {product.review_count && (
                          <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>({product.review_count})</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-baseline gap-2 mb-4">
                      {product.discount_price && product.discount_price < product.price ? (
                        <>
                          <span className="text-base font-black" style={{ color: 'var(--fg)' }}>{formatPrice(product.discount_price)}</span>
                          <span className="text-xs line-through" style={{ color: 'var(--fg-subtle)' }}>{formatPrice(product.price)}</span>
                        </>
                      ) : (
                        <span className="text-base font-black" style={{ color: 'var(--fg)' }}>{formatPrice(product.price)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveToCart(item)}
                        disabled={!product.is_in_stock || !defaultVariant}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                      >
                        <ShoppingBag size={13} />
                        {product.is_in_stock ? 'Move to Cart' : 'Out of Stock'}
                      </button>
                      <button
                        onClick={() => removeItem(product.product_id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Continue shopping */}
        {items.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
              style={{ color: 'var(--fg-muted)' }}
            >
              <ArrowRight size={14} /> Continue Shopping
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
