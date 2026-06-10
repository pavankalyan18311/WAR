'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ArrowRight, Tag, X, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getSummary, applyCoupon, removeCoupon, couponCode } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const summary = getSummary();

  const handleCoupon = () => {
    if (couponInput.toUpperCase() === 'SUMMER20') {
      applyCoupon('SUMMER20', Math.round(summary.subtotal * 0.2));
      setCouponSuccess('20% discount applied!');
      setCouponError('');
    } else if (couponInput.toUpperCase() === 'WELCOME10') {
      applyCoupon('WELCOME10', Math.round(summary.subtotal * 0.1));
      setCouponSuccess('10% discount applied!');
      setCouponError('');
    } else {
      setCouponError('Invalid coupon. Try SUMMER20 or WELCOME10.');
      setCouponSuccess('');
    }
  };

  if (!mounted || items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-5 py-32 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <ShoppingBag size={32} style={{ color: 'var(--fg-subtle)' }} />
        </div>
        <h1 className="text-2xl font-black mb-3" style={{ color: 'var(--fg)' }}>
          {mounted ? 'Your cart is empty' : 'Loading cart...'}
        </h1>
        {mounted && (
          <>
            <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>Add some amazing t-shirts to get started!</p>
            <Link href="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Browse Collection <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black" style={{ color: 'var(--fg)' }}>Your Cart</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''} in your bag
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.cart_item_id} className="flex gap-4 p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <Link href={`/products/${item.product.slug}`}
                className="relative w-20 h-24 rounded-xl overflow-hidden flex-shrink-0"
                style={{ background: 'var(--bg-elevated)' }}>
                <Image src={item.product.images[0]?.url ?? ''} alt={item.product.name} fill className="object-cover" sizes="80px" />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/products/${item.product.slug}`}
                      className="font-semibold text-sm leading-snug line-clamp-2 hover:underline"
                      style={{ color: 'var(--fg)' }}>
                      {item.product.name}
                    </Link>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                        Size: {item.variant.size}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                        {item.variant.color}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.cart_item_id)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: 'var(--fg-subtle)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-subtle)'; e.currentTarget.style.background = ''; }}
                    aria-label="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center rounded-full overflow-hidden"
                    style={{ border: '1.5px solid var(--border)' }}>
                    <button onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'var(--fg-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--fg)' }}>
                      {item.quantity}
                    </span>
                    <button onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center transition-colors"
                      style={{ color: 'var(--fg-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="font-black text-base" style={{ color: 'var(--fg)' }}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Order Note */}
          <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--fg-muted)' }}>
              Order Note (Optional)
            </label>
            <textarea rows={2} placeholder="Special instructions, gift messages..."
              className="w-full text-sm resize-none rounded-xl px-3 py-2.5 outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--fg)', border: '1.5px solid var(--border)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ring)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="h-fit sticky top-24">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-black text-sm tracking-widest uppercase" style={{ color: 'var(--fg)' }}>Order Summary</h2>
            </div>

            <div className="px-6 py-4 space-y-3 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <span>Subtotal</span>
                <span style={{ color: 'var(--fg)' }}>{mounted ? formatPrice(summary.subtotal) : '...'}</span>
              </div>
              {mounted && summary.discount > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--success)' }}>
                  <span>Discount ({couponCode})</span>
                  <span>-{formatPrice(summary.discount)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <span>Shipping</span>
                <span style={{ color: mounted && summary.shipping === 0 ? 'var(--success)' : 'var(--fg)' }}>
                  {mounted ? (summary.shipping === 0 ? 'FREE' : formatPrice(summary.shipping)) : '...'}
                </span>
              </div>
              {mounted && summary.subtotal > 0 && summary.subtotal < 999 && (
                <div className="text-xs px-3 py-2 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>
                  Add {formatPrice(999 - summary.subtotal)} more for{' '}
                  <strong style={{ color: 'var(--success)' }}>free shipping</strong>
                </div>
              )}
              <div className="pt-3 flex justify-between font-black text-base"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
                <span>Total</span>
                <span>{mounted ? formatPrice(summary.total) : '...'}</span>
              </div>
              {mounted && summary.discount > 0 && (
                <p className="text-xs text-center font-semibold py-1.5 px-3 rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', color: 'var(--success)' }}>
                  You save {formatPrice(summary.discount)} on this order!
                </p>
              )}
            </div>

            {/* Coupon */}
            <div className="px-6 pb-4">
              {couponCode ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)', border: '1px solid var(--success)' }}>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
                    <Tag size={13} /> {couponCode} applied
                  </div>
                  <button onClick={() => { removeCoupon(); setCouponSuccess(''); }} style={{ color: 'var(--success)' }}>
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--fg-subtle)' }}>
                    Have a coupon?
                  </p>
                  <div className="flex gap-2">
                    <input type="text" value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="SUMMER20 or WELCOME10"
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-medium outline-none"
                      style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ring)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                    <button onClick={handleCoupon}
                      className="px-3 py-2 rounded-xl text-xs font-bold"
                      style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>{couponError}</p>}
                  {couponSuccess && <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--success)' }}>{couponSuccess}</p>}
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <Link href="/checkout"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:opacity-90"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)', boxShadow: 'var(--shadow-md)' }}>
                Proceed to Checkout <ArrowRight size={15} />
              </Link>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                <ShieldCheck size={12} /> Secure &amp; encrypted checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
