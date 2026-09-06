'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getSummary, couponCode, applyCoupon, removeCoupon } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [inputCoupon, setInputCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const summary = getSummary();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = inputCoupon.trim().toUpperCase();
    if (!code) return;

    if (code === 'WAR10') {
      applyCoupon('WAR10', 0);
      setInputCoupon('');
    } else if (code === 'WELCOME20') {
      applyCoupon('WELCOME20', 0);
      setInputCoupon('');
    } else if (code === 'FREESHIP') {
      applyCoupon('FREESHIP', 0);
      setInputCoupon('');
    } else {
      setCouponError('Invalid coupon code. Try WAR10 or WELCOME20.');
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

  const FREE_SHIPPING_THRESHOLD = 999;
  const progress = mounted ? Math.min((summary.subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100) : 0;
  const remaining = mounted ? Math.max(FREE_SHIPPING_THRESHOLD - summary.subtotal, 0) : FREE_SHIPPING_THRESHOLD;

  if (!isOpen) return null;

  return (
    <div data-testid="cart-drawer" className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={closeCart} />

      {/* Drawer */}
      <div ref={drawerRef}
        className="relative w-full sm:w-[420px] flex flex-col h-full animate-fade-in"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} style={{ color: 'var(--fg)' }} />
            <h2 className="font-black text-base" style={{ color: 'var(--fg)' }}>Your Cart</h2>
            {mounted && items.length > 0 && (
              <span data-testid="cart-badge" className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {/* Shipping Progress */}
        {mounted && (
          <div className="px-5 py-3" style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
            {remaining === 0 ? (
              <p className="text-xs font-semibold text-center" style={{ color: 'var(--success)' }}>
                Congrats! You&apos;ve unlocked <strong>FREE shipping!</strong>
              </p>
            ) : (
              <>
                <p className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>
                  Add <strong style={{ color: 'var(--fg)' }}>{formatPrice(remaining)}</strong> more for free shipping
                </p>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: 'var(--accent)' }} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!mounted || items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <ShoppingBag size={24} style={{ color: 'var(--fg-subtle)' }} />
              </div>
              <p className="font-bold mb-2" style={{ color: 'var(--fg)' }}>
                {mounted ? 'Your cart is empty' : 'Loading...'}
              </p>
              {mounted && (
                <>
                  <p className="text-sm mb-5" style={{ color: 'var(--fg-muted)' }}>Add some t-shirts to get started!</p>
                  <Link href="/products" onClick={closeCart}
                    className="px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    Browse Products
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const itemId = item.cart_item_id || item.id || `${item.variant_id}`;
                const itemImg = item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600';
                const itemPrice = Number(item.price || item.variant?.price || item.product?.price || 0);

                return (
                  <div key={itemId} data-testid="cart-item" className="flex gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <Link href={`/products/${item.product?.slug || ''}`} onClick={closeCart}
                      className="relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: 'var(--bg-card)' }}>
                      <Image src={itemImg} alt={item.product?.name || 'Product'} fill className="object-cover" sizes="64px" />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-1">
                        <Link href={`/products/${item.product?.slug || ''}`} onClick={closeCart}
                          className="text-xs font-semibold leading-snug line-clamp-2 hover:underline"
                          style={{ color: 'var(--fg)' }}>
                          {item.product?.name || 'Product'}
                        </Link>
                        <button onClick={() => removeItem(itemId)}
                          className="p-0.5 rounded flex-shrink-0 transition-colors"
                          style={{ color: 'var(--fg-subtle)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-subtle)')}
                          aria-label="Remove">
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                          {item.variant?.size || 'Free Size'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--bg-card)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                          {item.variant?.color || 'Default'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center rounded-full overflow-hidden"
                          style={{ border: '1.5px solid var(--border)' }}>
                          <button onClick={() => updateQuantity(itemId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-xs"
                            style={{ color: 'var(--fg-muted)' }}>
                            <Minus size={10} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold" style={{ color: 'var(--fg)' }}>
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQuantity(itemId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center"
                            style={{ color: 'var(--fg-muted)' }}>
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="text-xs font-black" style={{ color: 'var(--fg)' }}>
                          {formatPrice(itemPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {mounted && items.length > 0 && (
          <div className="px-5 pb-6 pt-4 space-y-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            
            {/* Promo Code Input Box */}
            <div className="rounded-xl p-2.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              {couponCode ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={13} style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{couponCode} Applied</span>
                  </div>
                  <button onClick={removeCoupon} className="text-[11px] font-semibold text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-subtle)' }} />
                    <input
                      type="text"
                      value={inputCoupon}
                      onChange={(e) => setInputCoupon(e.target.value)}
                      placeholder="Coupon Code (WAR10)"
                      className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg outline-none"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                    />
                  </div>
                  <button type="submit" className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    Apply
                  </button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-red-500 mt-1">{couponError}</p>}
            </div>

            {/* Price Summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <span>Subtotal</span>
                <span className="font-semibold" style={{ color: 'var(--fg)' }}>{formatPrice(summary.subtotal)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between font-semibold" style={{ color: 'var(--success)' }}>
                  <span>Discount</span>
                  <span>-{formatPrice(summary.discount)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <span>Shipping</span>
                <span>{summary.shipping === 0 ? <strong style={{ color: 'var(--success)' }}>FREE</strong> : formatPrice(summary.shipping)}</span>
              </div>
              <div className="flex justify-between pt-2 font-bold text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
                <span>Total</span>
                <span className="text-base font-black">{formatPrice(summary.total)}</span>
              </div>
            </div>

            <Link href="/checkout" onClick={closeCart}
              className="w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)', boxShadow: 'var(--shadow-md)' }}>
              Proceed to Checkout <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
