'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProductImage from '@/components/product/ProductImage';
import { X, Plus, Minus, ArrowRight, Tag, Truck, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useCartQuoteSync } from '@/lib/checkout/useCartQuoteSync';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getSummary, couponCode, applyCoupon, removeCoupon, lineIssues, notices, dismissNotices, hasBlockingIssues } = useCartStore();
  useCartQuoteSync(isOpen);
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);
  const [inputCoupon, setInputCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const summary = getSummary();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = inputCoupon.trim().toUpperCase();
    if (!code) return;

    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: summary.subtotal, user_id: user?.id }),
      });
      const result = await res.json();
      if (!result.valid) {
        setCouponError(result.error || 'Invalid coupon code.');
      } else {
        applyCoupon(result.coupon.code, result.discount, result.coupon.discount_type);
        setInputCoupon('');
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeCart]);

  const FREE_SHIPPING_THRESHOLD = useCartStore((s) => s.shippingSettings.free_shipping_threshold);
  const hasThreshold = FREE_SHIPPING_THRESHOLD > 0;
  const progress = mounted && hasThreshold ? Math.min((summary.subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100) : 0;
  const remaining = mounted ? Math.max(FREE_SHIPPING_THRESHOLD - summary.subtotal, 0) : FREE_SHIPPING_THRESHOLD;
  const count = items.reduce((s, i) => s + i.quantity, 0);

  if (!isOpen) return null;

  return (
    <div data-testid="cart-drawer" className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: 'rgba(22,20,18,0.45)' }} onClick={closeCart} />

      {/* Drawer */}
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Your cart"
        className="relative w-full sm:w-[440px] flex flex-col h-full animate-fade-in"
        style={{ background: 'var(--page)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={20} style={{ color: 'var(--brand)' }} />
            <h2 className="ui-heading text-xl" style={{ color: 'var(--fg)' }}>Your Cart</h2>
            {mounted && items.length > 0 && (
              <span data-testid="cart-badge" className="ui-chip ui-chip-brand">
                {count} item{count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: 'var(--fg)' }} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Shipping Progress */}
        {mounted && hasThreshold && items.length > 0 && (
          <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            {remaining === 0 ? (
              <p className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--ok)' }}>
                <Truck size={16} /> Yay! You&apos;ve unlocked <strong>free shipping</strong>
              </p>
            ) : (
              <p className="text-sm inline-flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                <Truck size={16} style={{ color: 'var(--brand)' }} />
                <span>Add <strong style={{ color: 'var(--brand)' }}>{formatPrice(remaining)}</strong> more for free shipping</span>
              </p>
            )}
            <div className="w-full h-2 mt-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: remaining === 0 ? 'var(--ok)' : 'var(--brand)' }} />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!mounted || items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <span className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <ShoppingBag size={28} />
              </span>
              <p className="ui-heading text-2xl mb-2" style={{ color: 'var(--fg)' }}>
                {mounted ? 'Your cart is empty' : 'Loading…'}
              </p>
              {mounted && (
                <>
                  <p className="text-[15px] mb-7" style={{ color: 'var(--fg-muted)' }}>Start with the latest drop.</p>
                  <Link href="/products" onClick={closeCart} className="ui-btn">
                    Browse Products <ArrowRight size={16} />
                  </Link>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const itemId = item.cart_item_id || item.id || `${item.variant_id}`;
                const itemImg = item.product?.images?.[0]?.url;
                const itemPrice = Number(item.price || item.variant?.price || item.product?.price || 0);
                const atMax = item.quantity >= (item.variant?.stock_quantity ?? Infinity);
                const issue = lineIssues[(item.variant_id || item.variant?.variant_id) as string];
                const unavailable = issue === 'No longer available';

                return (
                  <li key={itemId} data-testid="cart-item" className="ui-card p-3 flex gap-3"
                    style={{ opacity: unavailable ? 0.65 : 1, borderColor: unavailable ? 'var(--bad)' : undefined }}>
                    <Link href={`/products/${item.product?.slug || ''}`} onClick={closeCart}
                      className="relative w-20 aspect-[4/5] overflow-hidden flex-shrink-0 rounded-lg"
                      style={{ background: 'var(--surface-2)' }}>
                      <ProductImage src={itemImg} alt={item.product?.name ?? ''} sizes="80px" />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between gap-2">
                        <Link href={`/products/${item.product?.slug || ''}`} onClick={closeCart}
                          className="text-[15px] font-semibold leading-snug line-clamp-2 hover:text-[var(--brand)] transition-colors"
                          style={{ color: 'var(--fg)' }}>
                          {item.product?.name || 'Product'}
                        </Link>
                        <button onClick={() => removeItem(itemId)}
                          className="w-7 h-7 -mt-0.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                          style={{ color: 'var(--fg-subtle)' }}
                          aria-label="Remove">
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>{item.variant?.size || 'Free Size'}</span>
                        {item.variant?.color && <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>{item.variant.color}</span>}
                      </div>
                      {issue && (
                        <p role="alert" className="text-[13px] mt-1.5 font-semibold" style={{ color: unavailable ? 'var(--bad)' : 'var(--warn)' }}>{issue}</p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2.5">
                        <div className="inline-flex items-center rounded-lg border" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                          <button onClick={() => updateQuantity(itemId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="w-8 h-8 flex items-center justify-center rounded-l-lg hover:bg-[var(--surface-2)]"
                            style={{ color: 'var(--fg)' }}>
                            <Minus size={13} />
                          </button>
                          <span className="w-7 text-center text-sm font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQuantity(itemId, item.quantity + 1)}
                            disabled={atMax}
                            title={atMax ? 'No more in stock' : undefined}
                            aria-label="Increase quantity"
                            className="w-8 h-8 flex items-center justify-center rounded-r-lg hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--fg)' }}>
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="text-[15px] font-bold whitespace-nowrap" style={{ color: 'var(--fg)' }}>
                          {formatPrice(itemPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {mounted && items.length > 0 && (
          <div className="px-5 pt-4 space-y-3.5 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
            {notices.length > 0 && (
              <div role="status" className="text-[13px] rounded-xl px-3.5 py-2.5 flex items-start justify-between gap-3" style={{ background: 'var(--warn-soft)', color: 'var(--fg)' }}>
                <ul className="space-y-0.5">{notices.map((n) => <li key={n}>{n}</li>)}</ul>
                <button onClick={dismissNotices} className="ui-link text-[13px] flex-shrink-0">OK</button>
              </div>
            )}

            {/* Promo Code */}
            {couponCode ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--ok-soft)' }}>
                <div className="flex items-center gap-2">
                  <Tag size={15} style={{ color: 'var(--ok)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--ok)' }}>{couponCode} Applied</span>
                </div>
                <button onClick={removeCoupon} className="text-[13px] font-semibold hover:underline" style={{ color: 'var(--bad)' }}>
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={inputCoupon}
                    onChange={(e) => setInputCoupon(e.target.value)}
                    placeholder="Enter coupon code"
                    aria-label="Coupon code"
                    className="ui-input flex-1 !py-2.5 uppercase tracking-[0.06em] text-sm"
                  />
                  <button type="submit" disabled={couponLoading} className="ui-btn-ghost !px-4 !py-2.5 disabled:opacity-50">
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </form>
                {couponError && <p className="text-[13px] mt-1.5" style={{ color: 'var(--bad)' }}>{couponError}</p>}
              </div>
            )}

            {/* Price Summary */}
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <dt>Subtotal</dt>
                <dd style={{ color: 'var(--fg)' }}>{formatPrice(summary.subtotal)}</dd>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <dt>Discount</dt>
                  <dd className="font-semibold" style={{ color: 'var(--ok)' }}>-{formatPrice(summary.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <dt>Shipping</dt>
                <dd className="font-semibold">{summary.shipping === 0 ? <span style={{ color: 'var(--ok)' }}>FREE</span> : <span style={{ color: 'var(--fg)' }}>{formatPrice(summary.shipping)}</span>}</dd>
              </div>
              <div className="flex justify-between items-baseline pt-2.5 border-t border-dashed" style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}>
                <dt className="font-bold">Total</dt>
                <dd className="ui-heading text-xl">{formatPrice(summary.total)}</dd>
              </div>
            </dl>

            {hasBlockingIssues() ? (
              <p className="text-[13px] text-center" style={{ color: 'var(--bad)' }}>Remove unavailable items to continue to checkout.</p>
            ) : (
              <Link href={user ? "/checkout" : "/auth/login?redirect=/checkout"} onClick={closeCart} className="ui-btn w-full !py-3.5 text-base">
                Proceed to Checkout <ArrowRight size={16} />
              </Link>
            )}
            <Link href="/cart" onClick={closeCart} className="block text-center text-sm font-semibold mx-auto w-fit hover:underline" style={{ color: 'var(--fg-muted)' }}>
              View full cart
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
