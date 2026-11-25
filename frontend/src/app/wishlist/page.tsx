'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, ShoppingBag, X } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { AccountShell } from '@/components/account/AccountShell';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { priceDisplay } from '@/lib/productPrice';
import { isVariantAvailable } from '@/lib/stock';
import type { WishlistItem } from '@/types';

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { logout } = useAuthStore();
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const addCartItem = useCartStore((s) => s.addItem);

  /** First size that can actually be bought (not just the first variant). */
  const buyableVariant = (item: WishlistItem) => item.product.variants?.find(isVariantAvailable);

  const handleMoveToCart = (item: WishlistItem) => {
    const variant = buyableVariant(item);
    if (variant) {
      addCartItem(item.product, variant, 1);
      removeItem(item.product.product_id);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full ui-page">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-12">
          <div className="h-10 w-56 skeleton mb-10" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] skeleton rounded-2xl" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <AccountShell
      active="wishlist"
      title="My Wishlist"
      subtitle={items.length === 0 ? 'No saved items' : `${items.length} item${items.length !== 1 ? 's' : ''} saved`}
      onLogout={async () => { await logout(); }}
    >
      {items.length === 0 ? (
        <div className="ui-card py-14 px-6 text-center">
          <span className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <Heart size={28} />
          </span>
          <h2 className="ui-heading text-2xl sm:text-3xl mb-2" style={{ color: 'var(--fg)' }}>Your wishlist is empty</h2>
          <p className="text-[15px] mb-7 max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
            Save items you love and come back to them anytime.
          </p>
          <Link href="/products" className="ui-btn">Browse Products <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {items.map((item) => {
              const { product } = item;
              const price = priceDisplay(product);
              const variant = buyableVariant(item);
              const href = `/products/${product.slug}`;

              return (
                <article key={item.wishlist_item_id} className="group ui-card overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/5] overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <Link href={href} className="absolute inset-0" aria-label={product.name}>
                      <ProductImage src={product.images?.[0]?.url} alt={product.name}
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        sizes="(max-width: 1024px) 50vw, 25vw" />
                    </Link>
                    <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5 pointer-events-none">
                      {!variant ? (
                        <span className="ui-chip" style={{ background: 'var(--fg)', color: 'var(--bg)' }}>Sold out</span>
                      ) : price.mrp ? (
                        <span className="ui-chip" style={{ background: 'var(--brand)', color: 'var(--brand-fg)' }}>−{price.percent}%</span>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => removeItem(product.product_id)} aria-label="Remove from wishlist"
                      className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors hover:text-[var(--bad)]"
                      style={{ background: 'var(--surface)', color: 'var(--fg)' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    {product.category && <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--fg-subtle)' }}>{product.category.name}</p>}
                    <Link href={href} className="text-sm sm:text-[15px] font-semibold leading-snug line-clamp-2 hover:text-[var(--brand)]" style={{ color: 'var(--fg)' }}>
                      {product.name}
                    </Link>
                    <div className="mt-1.5 flex items-baseline flex-wrap gap-x-2">
                      <span className="text-[15px] font-extrabold" style={{ color: 'var(--fg)' }}>{formatPrice(price.price)}</span>
                      {price.mrp && <span className="text-sm line-through" style={{ color: 'var(--fg-subtle)' }}>{formatPrice(price.mrp)}</span>}
                      {price.mrp && <span className="text-sm font-bold" style={{ color: 'var(--ok)' }}>{price.percent}% off</span>}
                    </div>
                    <div className="mt-auto pt-3.5">
                      <button type="button" onClick={() => handleMoveToCart(item)} disabled={!variant}
                        className="ui-btn w-full !py-2.5 text-sm">
                        {variant && <ShoppingBag size={15} />}
                        {variant ? `Move to Cart${variant.size ? ` · ${variant.size}` : ''}` : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link href="/products" className="ui-btn-ghost">
              Continue Shopping <ArrowRight size={15} />
            </Link>
          </div>
        </>
      )}
    </AccountShell>
  );
}
