'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductImage from '@/components/product/ProductImage';
import { Plus, Minus, ArrowRight, Tag, X, ShieldCheck, Truck, Trash2, ShoppingBag, Heart, RotateCcw, BadgePercent } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useCartQuoteSync } from '@/lib/checkout/useCartQuoteSync';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { useReturnDays } from '@/hooks/useReturnDays';
import type { CartItem } from '@/types';

/** MRP of a cart line (falls back to the selling price when there is no higher MRP). */
function lineMrp(item: CartItem): number {
  const compare = Number((item.variant as any)?.compare_at_price ?? (item.product as any)?.compare_at_price ?? 0);
  const unit = compare > item.price ? compare : item.price;
  return unit * item.quantity;
}

/** Free-shipping progress, using the admin's threshold from store settings. */
function FreeShippingProgress({ subtotal, threshold }: { subtotal: number; threshold: number }) {
  if (!threshold || threshold <= 0) return null;
  const done = subtotal >= threshold;
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  return (
    <div className="ui-card p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: done ? 'var(--ok-soft)' : 'var(--brand-soft)', color: done ? 'var(--ok)' : 'var(--brand)' }}>
          <Truck size={17} />
        </span>
        <p className="text-[15px]" style={{ color: 'var(--fg)' }}>
          {done ? (
            <>Yay! You&apos;ve unlocked <strong style={{ color: 'var(--ok)' }}>free shipping</strong> 🎉</>
          ) : (
            <>Add <strong style={{ color: 'var(--brand)' }}>{formatPrice(threshold - subtotal)}</strong> more for free shipping.</>
          )}
        </p>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }} role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: done ? 'var(--ok)' : 'var(--brand)' }} />
      </div>
    </div>
  );
}

export default function CartPage() {
  const returnDays = useReturnDays();
  const { items, removeItem, updateQuantity, getSummary, applyCoupon, removeCoupon, couponCode, lineIssues, notices, dismissNotices, hasBlockingIssues } = useCartStore();
  useCartQuoteSync();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const summary = getSummary();
  const freeShippingThreshold = useCartStore((s) => s.shippingSettings.free_shipping_threshold);

  const handleCoupon = async () => {
    const code = couponInput.toUpperCase().trim();
    if (!code) return;
    setCouponError('');
    setCouponSuccess('');
    setCouponLoading(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: summary.subtotal }),
      });
      const data = await res.json();

      if (data.valid) {
        applyCoupon(data.coupon.code, data.discount, data.coupon.discount_type);
        const desc = data.coupon.discount_type === 'free_shipping'
          ? 'Free shipping applied!'
          : data.coupon.discount_type === 'flat'
            ? `₹${data.discount} off applied!`
            : `${data.coupon.discount_value}% off applied!`;
        setCouponSuccess(desc);
      } else {
        setCouponError(data.error || 'Invalid coupon code.');
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  if (!mounted || items.length === 0) {
    return (
      <div className="ui-page w-full flex-1">
        <div className="max-w-md mx-auto w-full px-5 py-20 sm:py-28 text-center">
          <div className="ui-card p-8 sm:p-10">
            <span className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <ShoppingBag size={28} />
            </span>
            <h1 className="ui-heading text-2xl sm:text-3xl mb-2" style={{ color: 'var(--fg)' }}>
              {mounted ? 'Your cart is empty' : 'Loading cart…'}
            </h1>
            {mounted && (
              <>
                <p className="text-[15px] mb-8" style={{ color: 'var(--fg-muted)' }}>
                  Nothing here yet. Start with the latest drop — your next favourite tee is waiting.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Link href="/products" className="ui-btn">
                    Browse Collection <ArrowRight size={16} />
                  </Link>
                  <Link href="/wishlist" className="ui-btn-ghost"><Heart size={16} /> Your wishlist</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const mrpTotal = items.reduce((s, i) => s + lineMrp(i), 0);
  const productSavings = Math.max(0, mrpTotal - summary.subtotal);
  const totalSavings = productSavings + summary.discount;
  const blocked = hasBlockingIssues();

  return (
    <div className="ui-page w-full flex-1">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 pb-32 lg:pb-16">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="ui-heading text-3xl sm:text-4xl" style={{ color: 'var(--fg)' }}>Your Cart</h1>
            <p className="text-[15px] mt-1" style={{ color: 'var(--fg-muted)' }}>
              {count} item{count !== 1 ? 's' : ''} in your bag
            </p>
          </div>
          <Link href="/products" className="ui-link text-sm">Continue shopping</Link>
        </div>

        {notices.length > 0 && (
          <div role="status" className="mb-6 px-4 py-3.5 rounded-xl text-sm flex items-start justify-between gap-4"
            style={{ background: 'var(--warn-soft)', color: 'var(--fg)' }}>
            <ul className="space-y-1">{notices.map((n) => <li key={n}>{n}</li>)}</ul>
            <button onClick={dismissNotices} className="ui-link text-sm flex-shrink-0">OK</button>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Items */}
          <div className="lg:col-span-7 space-y-4">
            <FreeShippingProgress subtotal={summary.subtotal} threshold={freeShippingThreshold} />

            <ul className="space-y-3">
              {items.map((item) => {
                const atMax = item.quantity >= (item.variant?.stock_quantity ?? Infinity);
                const issue = lineIssues[(item.variant_id || item.variant?.variant_id) as string];
                const unavailable = issue === 'No longer available';
                const mrp = lineMrp(item);
                const lineTotal = item.price * item.quantity;
                const off = mrp > lineTotal ? Math.round(((mrp - lineTotal) / mrp) * 100) : 0;
                return (
                  <li key={item.cart_item_id} data-testid="cart-item" className="ui-card p-3 sm:p-4 flex gap-4"
                    style={{ opacity: unavailable ? 0.65 : 1, borderColor: unavailable ? 'var(--bad)' : undefined }}>
                    <Link href={`/products/${item.product.slug}`}
                      className="relative w-24 sm:w-28 aspect-[4/5] overflow-hidden flex-shrink-0 rounded-xl"
                      style={{ background: 'var(--surface-2)' }}>
                      <ProductImage src={item.product.images?.[0]?.url} alt={item.product.name} sizes="112px" />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between gap-3">
                        <Link href={`/products/${item.product.slug}`}
                          className="text-[15px] sm:text-base font-semibold leading-snug line-clamp-2 hover:text-[var(--brand)] transition-colors"
                          style={{ color: 'var(--fg)' }}>
                          {item.product.name}
                        </Link>
                        <button onClick={() => removeItem(item.cart_item_id)}
                          className="w-8 h-8 -mt-1 -mr-1 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[var(--bad-soft)] hover:text-[var(--bad)]"
                          style={{ color: 'var(--fg-subtle)' }}
                          aria-label="Remove">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>Size: {item.variant.size}</span>
                        {item.variant.color && <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>{item.variant.color}</span>}
                      </div>

                      <div className="flex items-end justify-between gap-3 mt-auto pt-3">
                        <div className="inline-flex items-center rounded-xl border" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)' }}>
                          <button onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="w-9 h-9 flex items-center justify-center rounded-l-xl transition-colors hover:bg-[var(--surface-2)]"
                            style={{ color: 'var(--fg)' }}>
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-[15px] font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                            disabled={atMax}
                            title={atMax ? 'No more in stock' : undefined}
                            aria-label="Increase quantity"
                            className="w-9 h-9 flex items-center justify-center rounded-r-xl transition-colors hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ color: 'var(--fg)' }}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold whitespace-nowrap" style={{ color: 'var(--fg)' }}>{formatPrice(lineTotal)}</p>
                          {off > 0 && (
                            <p className="text-xs whitespace-nowrap">
                              <span className="line-through" style={{ color: 'var(--fg-subtle)' }}>{formatPrice(mrp)}</span>{' '}
                              <span className="font-bold" style={{ color: 'var(--ok)' }}>{off}% off</span>
                            </p>
                          )}
                        </div>
                      </div>
                      {issue ? (
                        <p role="alert" className="text-[13px] mt-2 font-semibold" style={{ color: unavailable ? 'var(--bad)' : 'var(--warn)' }}>
                          {issue}{unavailable && ' — please remove it to continue'}
                        </p>
                      ) : atMax && (
                        <p className="text-[13px] mt-2" style={{ color: 'var(--warn)' }}>That&apos;s all we have in this size.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Order Note */}
            <div className="ui-card p-4 sm:p-5">
              <label htmlFor="order-note" className="block text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>Order note <span className="font-normal" style={{ color: 'var(--fg-muted)' }}>(optional)</span></label>
              <textarea id="order-note" rows={2} placeholder="Special instructions, gift messages..."
                className="ui-input resize-none"
              />
            </div>
          </div>

          {/* Order Summary */}
          <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-28">
            {/* Coupon */}
            <div className="ui-card p-4 sm:p-5">
              {couponCode ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'var(--ok-soft)' }}>
                  <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--ok)' }}>
                    <Tag size={15} /> {couponCode} applied
                  </div>
                  <button onClick={() => { removeCoupon(); setCouponSuccess(''); }} style={{ color: 'var(--ok)' }} aria-label="Remove coupon">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold mb-2.5 inline-flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                    <BadgePercent size={16} style={{ color: 'var(--brand)' }} /> Have a coupon?
                  </p>
                  <div className="flex gap-2">
                    <input data-testid="cart-coupon-input" type="text" value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); setCouponSuccess(''); }}
                      placeholder="Enter coupon code"
                      aria-label="Coupon code"
                      className="ui-input flex-1 uppercase tracking-[0.06em]"
                      onKeyDown={(e) => e.key === 'Enter' && handleCoupon()}
                      disabled={couponLoading}
                    />
                    <button onClick={handleCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="ui-btn-ghost !px-4 min-w-[84px] disabled:opacity-50 disabled:cursor-not-allowed">
                      {couponLoading
                        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-[13px] mt-2" style={{ color: 'var(--bad)' }}>{couponError}</p>}
                  {couponSuccess && <p className="text-[13px] mt-2 font-semibold" style={{ color: 'var(--ok)' }}>{couponSuccess}</p>}
                  <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>Your available coupons and reward points are shown at checkout.</p>
                </div>
              )}
            </div>

            <div className="ui-card p-5 sm:p-6">
              <h2 className="ui-heading text-xl mb-4" style={{ color: 'var(--fg)' }}>Order Summary</h2>

              <dl className="space-y-3 text-[15px]">
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <dt>Total MRP</dt>
                  <dd style={{ color: 'var(--fg)' }}>{formatPrice(mrpTotal)}</dd>
                </div>
                {productSavings > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                    <dt>Discount on MRP</dt>
                    <dd className="font-semibold" style={{ color: 'var(--ok)' }}>-{formatPrice(productSavings)}</dd>
                  </div>
                )}
                {summary.discount > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                    <dt>Coupon ({couponCode})</dt>
                    <dd className="font-semibold" style={{ color: 'var(--ok)' }}>-{formatPrice(summary.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <dt>Shipping</dt>
                  <dd className="font-semibold" style={{ color: summary.shipping === 0 ? 'var(--ok)' : 'var(--fg)' }}>
                    {summary.shipping === 0 ? 'FREE' : formatPrice(summary.shipping)}
                  </dd>
                </div>
                <div className="pt-4 mt-1 flex justify-between items-baseline border-t border-dashed" style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}>
                  <dt className="font-bold">Total</dt>
                  <dd className="ui-heading text-2xl">{formatPrice(summary.total)}</dd>
                </div>
                <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Inclusive of all taxes</p>
              </dl>

              {totalSavings > 0 && (
                <p className="mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-center" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
                  🎉 You save {formatPrice(totalSavings)} on this order!
                </p>
              )}

              <div className="hidden lg:block">
                {blocked ? (
                  <>
                    <span aria-disabled="true" className="ui-btn w-full mt-5 !py-4 opacity-50 cursor-not-allowed">
                      Proceed to Checkout <ArrowRight size={16} />
                    </span>
                    <p className="text-[13px] text-center mt-3" style={{ color: 'var(--bad)' }}>Remove unavailable items to continue.</p>
                  </>
                ) : (
                  <Link href="/checkout" className="ui-btn w-full mt-5 !py-4 text-base">
                    Proceed to Checkout <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              {!user && (
                <p className="text-[13px] text-center mt-3" style={{ color: 'var(--fg-muted)' }}>
                  You&apos;ll be asked to sign in before payment.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: ShieldCheck, text: 'Secure payments' },
                { icon: RotateCcw, text: `Easy ${returnDays}-day returns` },
                { icon: Truck, text: 'COD available' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="ui-card-soft px-2 py-3 flex flex-col items-center gap-1.5">
                  <Icon size={18} style={{ color: 'var(--brand)' }} />
                  <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--fg-muted)' }}>{text}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -8px 24px -12px rgba(0,0,0,0.18)' }}>
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="ui-heading text-xl leading-tight" style={{ color: 'var(--fg)' }}>{formatPrice(summary.total)}</p>
            {totalSavings > 0
              ? <p className="text-xs font-semibold" style={{ color: 'var(--ok)' }}>You save {formatPrice(totalSavings)}</p>
              : <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{count} item{count !== 1 ? 's' : ''} · incl. taxes</p>}
          </div>
          {blocked ? (
            <span aria-disabled="true" className="ui-btn opacity-50 cursor-not-allowed">Checkout</span>
          ) : (
            <Link href="/checkout" className="ui-btn !px-6">Checkout <ArrowRight size={16} /></Link>
          )}
        </div>
      </div>
    </div>
  );
}
