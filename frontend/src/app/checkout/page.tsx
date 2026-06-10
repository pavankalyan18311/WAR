'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, CreditCard, CheckCircle, ArrowLeft, ArrowRight, ShieldCheck, Lock, Smartphone, Building2 } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

const STEPS = [
  { id: 1, label: 'Delivery', icon: MapPin },
  { id: 2, label: 'Payment', icon: CreditCard },
  { id: 3, label: 'Review', icon: CheckCircle },
];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', desc: 'PhonePe, GPay, Paytm & more', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, MasterCard, Rupay', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', desc: 'All major banks', icon: Building2 },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when delivered', icon: MapPin },
];

interface AddressForm {
  firstName: string; lastName: string; email: string;
  phone: string; address: string; city: string;
  state: string; pincode: string;
}

export default function CheckoutPage() {
  const { items, getSummary, couponCode } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderRef] = useState(() => `TX${Date.now().toString(36).toUpperCase()}`);
  const [placing, setPlacing] = useState(false);
  const summary = getSummary();

  const [address, setAddress] = useState<AddressForm>({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
  });

  useEffect(() => { setMounted(true); }, []);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1600));
    setPlacing(false);
    setOrderPlaced(true);
  };

  if (orderPlaced) {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '2px solid var(--success)' }}>
          <CheckCircle size={36} style={{ color: 'var(--success)' }} />
        </div>
        <h1 className="text-3xl font-black mb-3" style={{ color: 'var(--fg)' }}>Order Confirmed!</h1>
        <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
          Thank you for your purchase. We&apos;ll send you tracking info soon.
        </p>
        <p className="text-xs font-semibold mb-8 px-4 py-2 rounded-lg inline-block"
          style={{ background: 'var(--bg-elevated)', color: 'var(--fg)' }}>
          Order Ref: <span style={{ color: 'var(--accent)' }}>{orderRef}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/account/orders"
            className="px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            Track Order <ArrowRight size={14} />
          </Link>
          <Link href="/products"
            className="px-6 py-3 rounded-full font-bold text-sm"
            style={{ border: '1.5px solid var(--border)', color: 'var(--fg-muted)' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const fieldStyle = {
    background: 'var(--bg-elevated)', color: 'var(--fg)',
    border: '1.5px solid var(--border)', borderRadius: '0.75rem',
  };

  const inputClass = 'w-full px-3.5 py-3 text-sm outline-none';

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm hover:opacity-70"
          style={{ color: 'var(--fg-muted)' }}>
          <ArrowLeft size={14} /> Back to Cart
        </Link>
        <h1 className="text-2xl font-black mt-3" style={{ color: 'var(--fg)' }}>Checkout</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center mb-10 max-w-md">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center transition-colors font-bold text-xs"
                  style={{
                    background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--bg-elevated)',
                    color: done || active ? (done ? '#fff' : 'var(--primary-fg)') : 'var(--fg-muted)',
                    border: done || active ? 'none' : '2px solid var(--border)',
                  }}>
                  {done ? <CheckCircle size={16} /> : <Icon size={15} />}
                </div>
                <span className="text-[10px] font-semibold whitespace-nowrap"
                  style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)' }}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 -mt-5 rounded"
                  style={{ background: done ? 'var(--success)' : 'var(--border)' }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Steps */}
        <div className="lg:col-span-2">
          {/* Step 1: Address */}
          {step === 1 && (
            <div className="rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="font-black mb-5" style={{ color: 'var(--fg)' }}>Delivery Address</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'firstName', label: 'First Name', colSpan: 1 },
                  { key: 'lastName', label: 'Last Name', colSpan: 1 },
                  { key: 'email', label: 'Email Address', colSpan: 2, type: 'email' },
                  { key: 'phone', label: 'Phone Number', colSpan: 1, type: 'tel' },
                  { key: 'pincode', label: 'Pincode', colSpan: 1 },
                  { key: 'address', label: 'Street Address', colSpan: 2 },
                  { key: 'city', label: 'City', colSpan: 1 },
                  { key: 'state', label: 'State', colSpan: 1 },
                ].map(({ key, label, colSpan, type }) => (
                  <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: 'var(--fg-muted)' }}>{label}</label>
                    <input type={type ?? 'text'}
                      value={address[key as keyof AddressForm]}
                      onChange={(e) => setAddress((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={label}
                      className={inputClass}
                      style={fieldStyle}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ring)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)}
                disabled={!address.firstName || !address.phone || !address.address}
                className="w-full mt-6 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                Continue to Payment <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="font-black mb-5" style={{ color: 'var(--fg)' }}>Payment Method</h2>
              <div className="space-y-3">
                {PAYMENT_METHODS.map(({ id, label, desc, icon: Icon }) => {
                  const active = paymentMethod === id;
                  return (
                    <button key={id} onClick={() => setPaymentMethod(id)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                      style={{
                        background: active ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'var(--bg-elevated)',
                        border: active ? '2px solid var(--primary)' : '2px solid var(--border)',
                      }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: active ? 'var(--primary)' : 'var(--bg-card)' }}>
                        <Icon size={18} style={{ color: active ? 'var(--primary-fg)' : 'var(--fg-muted)' }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{label}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: active ? 'var(--primary)' : 'var(--border)' }}>
                        {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-full font-bold text-sm"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--fg-muted)' }}>
                  Back
                </button>
                <button onClick={() => setStep(3)}
                  className="flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                  Review Order <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="font-black mb-5" style={{ color: 'var(--fg)' }}>Review Order</h2>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.cart_item_id} className="flex items-center gap-3">
                    <div className="relative w-14 h-16 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ background: 'var(--bg-elevated)' }}>
                      <Image src={item.product.images[0]?.url ?? ''} alt={item.product.name} fill className="object-cover" sizes="56px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--fg)' }}>{item.product.name}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Size: {item.variant.size} · {item.variant.color} · Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-black" style={{ color: 'var(--fg)' }}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3.5 rounded-full font-bold text-sm"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--fg-muted)' }}>
                  Back
                </button>
                <button onClick={handlePlaceOrder} disabled={placing}
                  className="flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#16a34a', color: '#fff' }}>
                  {placing ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>Place Order <CheckCircle size={15} /></>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="h-fit sticky top-24">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-black text-sm tracking-widest uppercase" style={{ color: 'var(--fg)' }}>Order Summary</h2>
            </div>

            {/* Item previews */}
            {mounted && (
              <div className="px-5 py-3 flex flex-col gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                {items.slice(0, 3).map((item) => (
                  <div key={item.cart_item_id} className="flex items-center gap-2">
                    <div className="relative w-10 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                      <Image src={item.product.images[0]?.url ?? ''} alt={item.product.name} fill className="object-cover" sizes="40px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--fg)' }}>{item.product.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>x{item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>+{items.length - 3} more items</p>
                )}
              </div>
            )}

            <div className="px-5 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <span>Subtotal</span>
                <span style={{ color: 'var(--fg)' }}>{mounted ? formatPrice(summary.subtotal) : '...'}</span>
              </div>
              {mounted && summary.discount > 0 && (
                <div className="flex justify-between" style={{ color: 'var(--success)' }}>
                  <span>Discount</span>
                  <span>-{formatPrice(summary.discount)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                <span>Shipping</span>
                <span style={{ color: mounted && summary.shipping === 0 ? 'var(--success)' : 'var(--fg)' }}>
                  {mounted ? (summary.shipping === 0 ? 'FREE' : formatPrice(summary.shipping)) : '...'}
                </span>
              </div>
              <div className="pt-2.5 flex justify-between font-black text-base"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
                <span>Total</span>
                <span>{mounted ? formatPrice(summary.total) : '...'}</span>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                <ShieldCheck size={12} />
                <Lock size={10} />
                SSL secured &amp; encrypted
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
