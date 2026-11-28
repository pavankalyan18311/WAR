'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductImage from '@/components/product/ProductImage';
import { MapPin, CreditCard, CheckCircle, ArrowLeft, ArrowRight, ShieldCheck, Lock, AlertCircle, Banknote, Plus, Truck, Copy, Check, RotateCcw, ShoppingBag } from 'lucide-react';
import { useReturnDays } from '@/hooks/useReturnDays';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import { buildCheckoutBody, CheckoutRequestError, guardSingleFlight, orderReference, placeCodOrder, startOnlinePayment } from '@/lib/checkout/client';
import { fetchPincodeInfo, type LocatedAddress } from '@/lib/geoClient';
import UseLocationButton from '@/components/address/UseLocationButton';
import CouponPicker from '@/components/checkout/CouponPicker';
import RewardPointsToggle from '@/components/checkout/RewardPointsToggle';
import '@/lib/razorpay';

const STEPS = [
  { id: 1, label: 'Delivery', icon: MapPin },
  { id: 2, label: 'Payment', icon: Banknote },
  { id: 3, label: 'Review', icon: CheckCircle },
];

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery (COD)', desc: 'Pay with cash upon delivery', icon: Banknote, available: true },
  { id: 'razorpay', label: 'Razorpay (UPI / Cards / NetBanking)', desc: 'Pay instantly via Google Pay, PhonePe, Paytm, RuPay, Visa, Mastercard & NetBanking', icon: CreditCard, available: true },
];

interface AddressForm {
  firstName: string; lastName: string; email: string;
  phone: string; address: string; city: string;
  state: string; pincode: string;
}

interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export default function CheckoutPage() {
  const returnDays = useReturnDays();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { items, getSummary, couponCode, clearCart, refreshQuote, lineIssues, notices, dismissNotices, hasBlockingIssues, applyCoupon, removeCoupon } = useCartStore();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    firstName: '', lastName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false,
  });
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrError, setAddrError] = useState('');

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [purchasedSummary, setPurchasedSummary] = useState<{ items: any[]; total: number; subtotal: number }>({ items: [], total: 0, subtotal: 0 });
  const summary = getSummary();

  // Reward points (1 point = ₹1). The server re-checks the balance and the amount when the order is placed.
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [placedWith, setPlacedWith] = useState<'razorpay' | 'cod' | 'points'>('razorpay');
  const pointsApplied = usePoints ? Math.min(pointsBalance, Math.max(0, summary.subtotal - summary.discount)) : 0;
  const payable = Math.max(0, summary.total - pointsApplied);
  const paidByPoints = pointsApplied > 0 && payable === 0;
  useEffect(() => {
    if (!user) return;
    fetch('/api/rewards')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPointsBalance(Number(d.balance) || 0))
      .catch(() => {});
  }, [user]);

  const handleCopyRef = (refText: string) => {
    if (refText && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(refText);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const [address, setAddress] = useState<AddressForm>({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
  });

  const [pincodeNotice, setPincodeNotice] = useState('');

  useEffect(() => { setMounted(true); }, []);

  // Check the cart with the server on arrival: current prices, stock and coupon.
  useEffect(() => {
    if (mounted && user && items.length) refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, user?.id]);

  // Ignore repeated clicks on Place Order / Pay Now while an order is being placed.
  const placeOrderRef = useRef<() => Promise<void>>(async () => {});
  const [placeOnce] = useState(() => guardSingleFlight(() => placeOrderRef.current()));

  // Pre-load Razorpay Checkout JS SDK Script
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);



  // Fetch live Supabase saved addresses for authenticated user via /api/addresses + localStorage backup
  useEffect(() => {
    const fetchSupabaseAddresses = async () => {
      let apiAddresses: SavedAddress[] = [];

      if (user?.id) {
        try {
          const response = await fetch('/api/addresses');
          if (response.ok) {
            const resData = await response.json();
            if (resData.addresses && Array.isArray(resData.addresses)) {
              apiAddresses = resData.addresses.map((item: any) => ({
                id: item.id,
                label: item.is_default ? 'Default' : (item.address_line_2 || 'Saved'),
                fullName: item.full_name || '',
                phone: item.phone || '',
                addressLine1: item.address_line_1 || '',
                addressLine2: item.address_line_2 || '',
                city: item.city || '',
                state: item.state || '',
                pincode: item.pincode || '',
                isDefault: item.is_default || false,
              }));
            }
          }
        } catch (err) {
          console.error('Failed to fetch addresses from API', err);
        }
      }

      // Check localStorage for offline/guest address backups
      let localAddresses: SavedAddress[] = [];
      try {
        const stored = localStorage.getItem(`war_addresses_${user?.id || 'guest'}`);
        if (stored) {
          localAddresses = JSON.parse(stored);
        }
      } catch (e) {}

      // Merge API and local addresses uniquely
      const existingIds = new Set(apiAddresses.map((a) => a.id));
      const combined = [...apiAddresses];
      for (const loc of localAddresses) {
        if (!existingIds.has(loc.id)) {
          combined.push(loc);
        }
      }

      setSavedAddresses(combined);
      if (combined.length > 0) {
        const def = combined.find((a) => a.isDefault) || combined[0];
        setSelectedSavedAddressId(def.id);
      }
    };
    fetchSupabaseAddresses();
  }, [user?.id]);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/auth/login?redirect=/checkout');
    }
  }, [mounted, user, router]);

  useEffect(() => {
    const selected = savedAddresses.find((a) => a.id === selectedSavedAddressId);
    if (!selected) return;
    const [firstName = '', ...lastParts] = selected.fullName.split(' ');
    setAddress((prev) => ({
      ...prev,
      firstName: firstName || prev.firstName,
      lastName: lastParts.join(' ') || prev.lastName,
      email: user?.email || prev.email,
      phone: selected.phone || prev.phone,
      address: selected.addressLine2 ? `${selected.addressLine1}, ${selected.addressLine2}` : selected.addressLine1,
      city: selected.city,
      state: selected.state,
      pincode: selected.pincode,
    }));
  }, [selectedSavedAddressId, savedAddresses, user]);

  const handlePincodeAutofill = (pinVal: string, target: 'inline' | 'main') => {
    const cleanPin = pinVal.replace(/\D/g, '').slice(0, 6);
    setPincodeNotice('');

    if (target === 'inline') {
      setNewAddr((p) => ({ ...p, pincode: cleanPin }));
    } else {
      setAddress((p) => ({ ...p, pincode: cleanPin }));
    }

    if (cleanPin.length === 6) {
      fetchPincodeInfo(cleanPin).then((info) => {
        if (!info) return;
        const fill = <T extends { city: string; state: string }>(p: T): T => ({ ...p, city: info.city || p.city, state: info.state || p.state });
        if (target === 'inline') setNewAddr(fill);
        else setAddress(fill);
        setPincodeNotice(`Auto-filled city (${info.city}) & state (${info.state})`);
      });
    }
  };

  /** "Use my current location": street/area only fill empty fields; city, state and pincode are replaced. */
  const applyDetectedAddress = (target: 'inline' | 'main') => (a: LocatedAddress) => {
    const street = [a.line1, a.area].filter(Boolean).join(', ');
    if (target === 'inline') {
      setNewAddr((p) => ({
        ...p,
        addressLine1: p.addressLine1 || a.line1,
        addressLine2: p.addressLine2 || a.area,
        city: a.city || p.city, state: a.state || p.state, pincode: a.pincode || p.pincode,
      }));
    } else {
      setAddress((p) => ({
        ...p,
        address: p.address || street,
        city: a.city || p.city, state: a.state || p.state, pincode: a.pincode || p.pincode,
      }));
    }
    setPincodeNotice('');
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError('');
    if (!newAddr.firstName.trim() || !newAddr.phone.trim() || !newAddr.addressLine1.trim() || !newAddr.pincode.trim() || !newAddr.city.trim()) {
      setAddrError('Please fill in all required fields marked with *');
      return;
    }

    setSavingAddr(true);
    try {
      const fullName = `${newAddr.firstName} ${newAddr.lastName}`.trim();
      const payload = {
        user_id: user?.id,
        full_name: fullName,
        phone: newAddr.phone.trim(),
        address_line_1: newAddr.addressLine1.trim(),
        address_line_2: newAddr.addressLine2.trim() || null,
        city: newAddr.city.trim(),
        state: newAddr.state.trim(),
        pincode: newAddr.pincode.trim(),
        country: 'India',
        is_default: newAddr.isDefault || savedAddresses.length === 0,
      };

      let addedItem: SavedAddress;

      if (user?.id) {
        const res = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (res.ok && resData.address) {
          addedItem = {
            id: resData.address.id || `addr-${Date.now()}`,
            label: resData.address.is_default ? 'Default' : 'Saved',
            fullName: resData.address.full_name,
            phone: resData.address.phone,
            addressLine1: resData.address.address_line_1,
            addressLine2: resData.address.address_line_2,
            city: resData.address.city,
            state: resData.address.state,
            pincode: resData.address.pincode,
            isDefault: resData.address.is_default,
          };
        } else {
          throw new Error(resData.error || 'Failed to save address');
        }
      } else {
        const guestId = `guest-addr-${Date.now()}`;
        addedItem = {
          id: guestId,
          label: 'Saved Address',
          fullName,
          phone: newAddr.phone,
          addressLine1: newAddr.addressLine1,
          addressLine2: newAddr.addressLine2,
          city: newAddr.city,
          state: newAddr.state,
          pincode: newAddr.pincode,
          isDefault: true,
        };
      }

      const updatedList = [addedItem, ...savedAddresses.map((a) => newAddr.isDefault ? { ...a, isDefault: false } : a)];
      setSavedAddresses(updatedList);
      setSelectedSavedAddressId(addedItem.id);
      setShowAddAddressForm(false);
      setNewAddr({
        firstName: '', lastName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', isDefault: false
      });

      try {
        localStorage.setItem(`war_addresses_${user?.id || 'guest'}`, JSON.stringify(updatedList));
      } catch (e) {}

    } catch (err: any) {
      setAddrError(err.message || 'Error saving address');
    } finally {
      setSavingAddr(false);
    }
  };

  const deliveryAddress = useMemo(() => ({
    full_name: `${address.firstName} ${address.lastName}`.trim(),
    phone: address.phone,
    address_line_1: address.address,
    address_line_2: '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: 'India',
  }), [address]);

  if (!mounted) {
    return (
      <div className="ui-page w-full flex-1">
        <div className="max-w-7xl mx-auto w-full px-5 py-28 text-center">
          <div className="w-8 h-8 border-[3px] rounded-full animate-spin mx-auto mb-5"
            style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
          <p className="text-[15px] font-semibold" style={{ color: 'var(--fg-muted)' }}>Loading Checkout…</p>
        </div>
      </div>
    );
  }

  const placeOrder = async () => {
    setPaymentError(null);
    setPlacing(true);
    try {
      if (items.length === 0) throw new Error('Your cart is empty. Please add items before checking out.');
      if (hasBlockingIssues()) throw new Error('Some items in your bag are no longer available. Please remove them from your cart first.');
      const body = buildCheckoutBody(items, couponCode, deliveryAddress, pointsApplied);
      const method = paidByPoints ? 'points' : paymentMethod === 'razorpay' ? 'razorpay' : 'cod';
      const purchased = [...items];

      const result = method === 'razorpay'
        ? await startOnlinePayment(
            body,
            { name: deliveryAddress.full_name, email: user?.email ?? '', contact: deliveryAddress.phone },
            (options) => {
              const rzp = new window.Razorpay(options);
              rzp.on('payment.failed', (resp) => setPaymentError(resp.error?.description || 'Payment failed. Please try again.'));
              rzp.open();
            },
          )
        : { ...(await placeCodOrder(body)), paymentId: '' };

      setPlacedWith(method);
      setOrderId(result.orderId);
      setOrderRef(orderReference(result.orderId));
      setPaymentId(result.paymentId);
      setPurchasedSummary({ items: purchased, total: result.total, subtotal: summary.subtotal });
      clearCart();
      setOrderPlaced(true);
    } catch (err: any) {
      console.error('Order placement error:', err);
      if (err instanceof CheckoutRequestError && err.status === 401) {
        // Session expired: sign in again and come back here — the cart is kept.
        router.push('/auth/login?redirect=/checkout');
        return;
      }
      if (err instanceof CheckoutRequestError && (err.status === 400 || err.status === 409)) {
        await refreshQuote(); // show what changed (stock, price, coupon)
      }
      setPaymentError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };
  placeOrderRef.current = placeOrder;
  const handlePlaceOrder = () => { placeOnce(); };

  if (orderPlaced) {
    const finalItems = purchasedSummary.items.length > 0 ? purchasedSummary.items : items;
    const finalTotal = purchasedSummary.total || summary.total;

    return (
      <div className="ui-page w-full flex-1">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 animate-fade-in">
          {/* Header */}
          <div className="ui-card p-6 sm:p-10 text-center mb-5 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: 'linear-gradient(90deg, var(--brand), var(--ok))' }} />
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
              <Check size={32} strokeWidth={2.5} />
            </div>
            <span className="ui-chip ui-chip-ok mb-3">ORDER CONFIRMED</span>
            <h1 className="ui-heading text-3xl sm:text-4xl mb-3" style={{ color: 'var(--fg)' }}>
              Thank You For Your Order!
            </h1>
            <p className="text-[15px] sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              {placedWith === 'points'
                ? 'Your order was paid in full with your reward points. We are preparing it for dispatch.'
                : placedWith === 'razorpay'
                ? `Your payment of ${formatPrice(finalTotal)} was verified successfully. We are preparing your order for immediate dispatch.`
                : `Your Cash on Delivery order is confirmed! Please keep ${formatPrice(finalTotal)} ready upon delivery.`}
            </p>

            {/* Order Reference */}
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface-2)' }}>
              <div className="text-left">
                <p className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Order Reference ID</p>
                <p className="ui-heading text-xl tracking-wide" style={{ color: 'var(--fg)' }}>{orderRef}</p>
              </div>
              <button
                onClick={() => handleCopyRef(orderRef)}
                className="ui-btn-ghost !px-3.5 !py-2 text-sm">
                {copiedRef ? <Check size={15} style={{ color: 'var(--ok)' }} /> : <Copy size={15} />}
                {copiedRef ? 'Copied' : 'Copy Ref'}
              </button>
              <span className={`ui-chip ${placedWith === 'cod' ? 'ui-chip-warn' : 'ui-chip-ok'}`}>
                {placedWith === 'points' ? '✓ Paid with reward points' : placedWith === 'razorpay' ? '✓ Paid (Razorpay)' : 'Cash on Delivery'}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-5 mb-6">
            {/* Purchased Items */}
            <div className="md:col-span-7 ui-card p-5 sm:p-6">
              <h2 className="ui-heading text-lg mb-3" style={{ color: 'var(--fg)' }}>Ordered Items ({finalItems.length})</h2>
              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {finalItems.map((it, idx) => (
                  <li key={it.cart_item_id || idx} className="flex items-center gap-4 py-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="relative w-14 aspect-[4/5] overflow-hidden flex-shrink-0 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                      <ProductImage src={it.product?.images?.[0]?.url} alt={it.product?.name ?? ''} sizes="56px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--fg)' }}>{it.product?.name}</p>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        {it.variant?.size ? `Size: ${it.variant.size} · ` : ''}Qty: {it.quantity}
                      </p>
                    </div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>{formatPrice((it.price || 0) * it.quantity)}</p>
                  </li>
                ))}
              </ul>
              <div className="pt-4 mt-1 border-t border-dashed flex justify-between items-baseline" style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}>
                <span className="font-bold">Total Amount</span>
                <span className="ui-heading text-2xl">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Next steps + Delivery */}
            <div className="md:col-span-5 space-y-5">
              <div className="ui-card p-5 sm:p-6">
                <p className="font-bold mb-2 inline-flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                  <Truck size={17} style={{ color: 'var(--brand)' }} /> What happens next
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>We will pack your order and share the courier tracking number on your order page as soon as it ships.</p>
                {paymentId && <p className="mt-2 font-mono text-xs" style={{ color: 'var(--fg-subtle)' }}>Razorpay Payment ID: {paymentId}</p>}
              </div>

              <div className="ui-card p-5 sm:p-6">
                <p className="font-bold mb-2 inline-flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                  <MapPin size={17} style={{ color: 'var(--brand)' }} /> Delivery Address
                </p>
                <p className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>{deliveryAddress.full_name}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                  {deliveryAddress.address_line_1}, {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--fg-muted)' }}>Contact: {deliveryAddress.phone}</p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/account/orders/${orderId}`} className="ui-btn flex-1 !py-3.5">
              <Truck size={16} /> View Order Status
            </Link>
            <Link href="/account/orders" className="ui-btn-ghost flex-1">
              View Order History
            </Link>
            <Link href="/products" className="ui-btn-ghost">
              Continue Shopping <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Inputs use the shared UI kit .ui-input style; wrappers need no styling of their own.
  const fieldStyle = {};
  const inputClass = 'ui-input';
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const mrpTotal = items.reduce((s, i) => {
    const compare = Number((i.variant as any)?.compare_at_price ?? (i.product as any)?.compare_at_price ?? 0);
    return s + (compare > i.price ? compare : i.price) * i.quantity;
  }, 0);
  // Nothing to check out: say so, rather than showing an empty order form.
  if (items.length === 0) {
    return (
      <div className="ui-page w-full flex-1">
        <div className="max-w-md mx-auto w-full px-5 py-20 sm:py-28 text-center">
          <div className="ui-card p-8 sm:p-10">
            <span className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
              <ShoppingBag size={28} />
            </span>
            <h1 className="ui-heading text-2xl sm:text-3xl mb-2" style={{ color: 'var(--fg)' }}>Your cart is empty</h1>
            <p className="text-[15px] mb-8" style={{ color: 'var(--fg-muted)' }}>Add a tee or two, then come back here to check out.</p>
            <Link href="/shop" className="ui-btn">Shop the drop <ArrowRight size={16} /></Link>
          </div>
        </div>
      </div>
    );
  }

  const productSavings = Math.max(0, mrpTotal - summary.subtotal);
  const totalSavings = productSavings + summary.discount + pointsApplied;
  const sectionTitle = 'ui-heading text-xl sm:text-2xl';

  return (
    <div className="ui-page w-full flex-1">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 pb-16">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              style={{ color: 'var(--fg-muted)' }}>
              <ArrowLeft size={15} /> Back to Cart
            </Link>
            <h1 className="ui-heading text-3xl sm:text-4xl mt-2" style={{ color: 'var(--fg)' }}>Checkout</h1>
          </div>

          {/* Step Indicator: 1 Address → 2 Payment → 3 Review */}
          <ol className="flex items-center gap-2 sm:gap-3" aria-label="Checkout steps">
            {STEPS.map((s, idx) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <li key={s.id} className="flex items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums flex-shrink-0 transition-colors"
                      style={{
                        background: done ? 'var(--ok)' : active ? 'var(--brand)' : 'var(--surface)',
                        color: done || active ? 'var(--brand-fg)' : 'var(--fg-muted)',
                        border: done || active ? 'none' : '1.5px solid var(--border-strong)',
                      }}>
                      {done ? <Check size={16} strokeWidth={3} /> : s.id}
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap"
                      style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)' }}>{s.label}</span>
                  </span>
                  {idx < STEPS.length - 1 && (
                    <span className="w-4 sm:w-8 h-[2px] rounded-full" style={{ background: done ? 'var(--ok)' : 'var(--border-strong)' }} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {notices.length > 0 && (
          <div role="status" className="mb-5 px-4 py-3.5 rounded-xl text-sm flex items-start justify-between gap-4" style={{ background: 'var(--warn-soft)', color: 'var(--fg)' }}>
            <ul className="space-y-1">{notices.map((n) => <li key={n}>{n}</li>)}</ul>
            <button onClick={dismissNotices} className="ui-link text-sm flex-shrink-0">OK</button>
          </div>
        )}

        {hasBlockingIssues() && (
          <div role="alert" className="mb-5 px-4 py-3.5 rounded-xl text-sm flex flex-wrap items-center justify-between gap-3" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
            <span>Some items in your bag are no longer available. Remove them to continue.</span>
            <Link href="/cart" className="font-bold underline">Review cart</Link>
          </div>
        )}

        {paymentError && (
          <div role="alert" className="mb-5 px-4 py-3.5 rounded-xl flex items-center gap-3" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="text-sm font-medium">{paymentError}</p>
          </div>
        )}

        {/* Mobile: quick total */}
        <div className="lg:hidden ui-card px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{itemCount} item{itemCount !== 1 ? 's' : ''} · Total</span>
          <span className="ui-heading text-lg" style={{ color: 'var(--fg)' }}>{formatPrice(payable)}</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          {/* Left: Steps */}
          <div className="lg:col-span-7">
            {/* Step 1: Address */}
            {step === 1 && (
              <div className="ui-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className={sectionTitle} style={{ color: 'var(--fg)' }}>Delivery Address</h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                      {savedAddresses.length > 0
                        ? (showAddAddressForm ? 'Enter details for your new delivery address' : 'Select from your saved addresses below or add a new one')
                        : 'Enter your delivery address details below'}
                    </p>
                  </div>
                  {/* Only show "+ Add New Address" button if there are existing saved addresses */}
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowAddAddressForm((v) => !v); setAddrError(''); setPincodeNotice(''); }}
                      className="ui-btn-ghost !px-3.5 !py-2 text-sm">
                      <Plus size={15} className={showAddAddressForm ? 'rotate-45 transition-transform' : ''} />
                      {showAddAddressForm ? 'Back to Saved Addresses' : 'Add New Address'}
                    </button>
                  )}
                </div>

                {/* Pincode Auto-Fill Notice */}
                {pincodeNotice && (
                  <div role="status" className="mb-4 px-3.5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
                    <CheckCircle size={15} />
                    <span>{pincodeNotice}</span>
                  </div>
                )}

                {/* Inline Add New Address Form (Triggered when user clicks Add New Address) */}
                {showAddAddressForm && (
                  <form onSubmit={handleSaveNewAddress} className="mb-2 p-4 sm:p-5 space-y-3.5 animate-fade-in rounded-2xl border-2"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--brand)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold" style={{ color: 'var(--fg)' }}>Add New Delivery Address</h3>
                      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Saved to your account</span>
                    </div>

                    {addrError && (
                      <div role="alert" className="px-3.5 py-3 text-[13px] rounded-xl" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
                        {addrError}
                      </div>
                    )}

                    <UseLocationButton onDetected={applyDetectedAddress('inline')} fallbackFieldId="new-address-line1" />

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div style={fieldStyle}>
                        <input type="text" name="given-name" autoComplete="shipping given-name" aria-label="First name" placeholder="First Name *" value={newAddr.firstName}
                          onChange={(e) => setNewAddr((p) => ({ ...p, firstName: e.target.value }))} className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="text" name="family-name" autoComplete="shipping family-name" aria-label="Last name" placeholder="Last Name" value={newAddr.lastName}
                          onChange={(e) => setNewAddr((p) => ({ ...p, lastName: e.target.value }))} className={inputClass} />
                      </div>
                    </div>

                    <div style={fieldStyle}>
                      <input type="tel" name="tel" autoComplete="shipping tel" inputMode="tel" aria-label="Mobile number" placeholder="Mobile Phone Number *" value={newAddr.phone}
                        onChange={(e) => setNewAddr((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
                    </div>

                    <div style={fieldStyle}>
                      <input id="new-address-line1" type="text" name="address-line1" autoComplete="shipping address-line1" aria-label="Flat, house no., building, street" placeholder="Flat, House no., Building, Street *" value={newAddr.addressLine1}
                        onChange={(e) => setNewAddr((p) => ({ ...p, addressLine1: e.target.value }))} className={inputClass} />
                    </div>

                    <div style={fieldStyle}>
                      <input type="text" name="address-line2" autoComplete="shipping address-line2" aria-label="Landmark or area" placeholder="Landmark / Area (Optional)" value={newAddr.addressLine2}
                        onChange={(e) => setNewAddr((p) => ({ ...p, addressLine2: e.target.value }))} className={inputClass} />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                      <div style={fieldStyle}>
                        <input type="text" name="postal-code" autoComplete="shipping postal-code" inputMode="numeric" aria-label="Pincode" placeholder="Pincode *" value={newAddr.pincode} maxLength={6}
                          onChange={(e) => handlePincodeAutofill(e.target.value, 'inline')} className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="text" name="address-level2" autoComplete="shipping address-level2" aria-label="City" placeholder="City *" value={newAddr.city}
                          onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))} className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="text" name="address-level1" autoComplete="shipping address-level1" aria-label="State" placeholder="State *" value={newAddr.state}
                          onChange={(e) => setNewAddr((p) => ({ ...p, state: e.target.value }))} className={inputClass} />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                      <input type="checkbox" checked={newAddr.isDefault}
                        onChange={(e) => setNewAddr((p) => ({ ...p, isDefault: e.target.checked }))}
                        className="w-4 h-4 cursor-pointer" style={{ accentColor: 'var(--brand)' }} />
                      <span className="text-sm" style={{ color: 'var(--fg)' }}>Set as default delivery address</span>
                    </label>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowAddAddressForm(false)} className="ui-btn-ghost">
                        Cancel
                      </button>
                      <button type="submit" disabled={savingAddr} className="ui-btn flex-1">
                        {savingAddr ? 'Saving Address…' : 'Save & Select Address'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Saved Address Cards Grid (Shown when user has saved addresses and form is closed) */}
                {savedAddresses.length > 0 && !showAddAddressForm ? (
                  <div>
                    <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Saved addresses">
                      {savedAddresses.map((addrItem) => {
                        const isSelected = selectedSavedAddressId === addrItem.id;
                        return (
                          <div key={addrItem.id}
                            role="radio" aria-checked={isSelected} tabIndex={0}
                            onClick={() => setSelectedSavedAddressId(addrItem.id)}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelectedSavedAddressId(addrItem.id))}
                            className="p-4 cursor-pointer transition-all relative flex flex-col justify-between rounded-2xl border-2"
                            style={{
                              background: isSelected ? 'var(--brand-soft)' : 'var(--surface)',
                              borderColor: isSelected ? 'var(--brand)' : 'var(--border)',
                            }}>
                            <div>
                              <div className="flex items-center justify-between mb-2.5">
                                <span className={`ui-chip ${addrItem.isDefault ? 'ui-chip-ok' : ''}`}
                                  style={addrItem.isDefault ? undefined : { background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                                  {addrItem.isDefault ? 'Default' : addrItem.label || 'Saved'}
                                </span>
                                <span className="w-5 h-5 rounded-full flex items-center justify-center border-2"
                                  style={{ borderColor: isSelected ? 'var(--brand)' : 'var(--border-strong)' }}>
                                  {isSelected && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />}
                                </span>
                              </div>
                              <p className="text-base font-bold truncate" style={{ color: 'var(--fg)' }}>{addrItem.fullName}</p>
                              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                {addrItem.addressLine1}{addrItem.addressLine2 ? `, ${addrItem.addressLine2}` : ''}, {addrItem.city}, {addrItem.state} - {addrItem.pincode}
                              </p>
                              <p className="text-[13px] mt-2" style={{ color: 'var(--fg-muted)' }}>Phone: {addrItem.phone}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button onClick={() => setStep(2)}
                      disabled={!selectedSavedAddressId}
                      className="ui-btn w-full mt-5 !py-4 text-base">
                      Continue to Payment <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  /* Manual Form for Guest or First-Time Address Entry (NO redundant "+ Add New Address" button in header) */
                  !showAddAddressForm && (
                    <form className="space-y-3.5" autoComplete="on" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                      <UseLocationButton onDetected={applyDetectedAddress('main')} fallbackFieldId="checkout-street" />

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div style={fieldStyle}>
                          <input type="text" name="given-name" autoComplete="shipping given-name" aria-label="First name" placeholder="First Name *" value={address.firstName}
                            onChange={(e) => setAddress((p) => ({ ...p, firstName: e.target.value }))}
                            className={inputClass} />
                        </div>
                        <div style={fieldStyle}>
                          <input type="text" name="family-name" autoComplete="shipping family-name" aria-label="Last name" placeholder="Last Name *" value={address.lastName}
                            onChange={(e) => setAddress((p) => ({ ...p, lastName: e.target.value }))}
                            className={inputClass} />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div style={fieldStyle}>
                          <input type="email" name="email" autoComplete="email" aria-label="Email" placeholder="Email *" value={address.email}
                            onChange={(e) => setAddress((p) => ({ ...p, email: e.target.value }))}
                            className={inputClass} />
                        </div>
                        <div style={fieldStyle}>
                          <input type="tel" name="tel" autoComplete="shipping tel" inputMode="tel" aria-label="Phone" placeholder="Phone *" value={address.phone}
                            onChange={(e) => setAddress((p) => ({ ...p, phone: e.target.value }))}
                            className={inputClass} />
                        </div>
                      </div>

                      <div style={fieldStyle}>
                        <input id="checkout-street" type="text" name="street-address" autoComplete="shipping street-address" aria-label="Flat, house no., building, street" placeholder="Flat, House no., Building, Street *" value={address.address}
                          onChange={(e) => setAddress((p) => ({ ...p, address: e.target.value }))}
                          className={inputClass} />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div style={fieldStyle}>
                          <input type="text" name="postal-code" autoComplete="shipping postal-code" inputMode="numeric" aria-label="Pincode" placeholder="Pincode *" value={address.pincode} maxLength={6}
                            onChange={(e) => handlePincodeAutofill(e.target.value, 'main')}
                            className={inputClass} />
                        </div>
                        <div style={fieldStyle}>
                          <input type="text" name="address-level2" autoComplete="shipping address-level2" aria-label="City" placeholder="City *" value={address.city}
                            onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                            className={inputClass} />
                        </div>
                        <div style={fieldStyle}>
                          <input type="text" name="address-level1" autoComplete="shipping address-level1" aria-label="State" placeholder="State *" value={address.state}
                            onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))}
                            className={inputClass} />
                        </div>
                      </div>

                      <button type="submit"
                        disabled={!address.firstName || !address.phone || !address.address || !address.pincode}
                        className="ui-btn w-full mt-2 !py-4 text-base">
                        Continue to Payment <ArrowRight size={16} />
                      </button>
                    </form>
                  )
                )}
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="ui-card p-5 sm:p-6">
                <h2 className={sectionTitle} style={{ color: 'var(--fg)' }}>Select Payment Method</h2>
                <p className="text-sm mt-1 mb-5 inline-flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
                  <Lock size={14} /> All transactions are secure and encrypted.
                </p>

                {paidByPoints ? (
                  <div className="rounded-2xl p-4 mb-6 flex items-start gap-3 border-2" style={{ borderColor: 'var(--ok)', background: 'var(--ok-soft)' }}>
                    <Check size={20} style={{ color: 'var(--ok)' }} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>Paid in full with your reward points</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>No payment needed — just review and place your order.</p>
                    </div>
                  </div>
                ) : (
                <div className="space-y-3 mb-6" role="radiogroup" aria-label="Payment method">
                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon;
                    const active = paymentMethod === pm.id;
                    return (
                      <div key={pm.id}
                        role="radio" aria-checked={active} aria-label={pm.label} aria-disabled={!pm.available} tabIndex={pm.available ? 0 : -1}
                        onClick={() => pm.available && setPaymentMethod(pm.id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pm.available && (e.preventDefault(), setPaymentMethod(pm.id))}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${pm.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                        style={{
                          background: active ? 'var(--brand-soft)' : 'var(--surface)',
                          borderColor: active ? 'var(--brand)' : 'var(--border)',
                        }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                          style={{ borderColor: active ? 'var(--brand)' : 'var(--border-strong)' }}>
                          {active && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brand)' }} />}
                        </span>
                        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: active ? 'var(--surface)' : 'var(--surface-2)', color: active ? 'var(--brand)' : 'var(--fg-muted)' }}>
                          <Icon size={20} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>{pm.label}</p>
                            {!pm.available && (
                              <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                                Coming Next
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{pm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="ui-btn-ghost">
                    Back
                  </button>
                  <button onClick={() => setStep(3)} className="ui-btn flex-1 !py-3.5">
                    Review Order <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Place Order */}
            {step === 3 && (
              <div className="ui-card p-5 sm:p-6 space-y-5">
                <h2 className={sectionTitle} style={{ color: 'var(--fg)' }}>Review &amp; Place Order</h2>

                <dl className="space-y-3">
                  {/* Delivery info summary */}
                  <div className="ui-card-soft p-4 flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <MapPin size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
                      <div>
                        <dt className="text-[13px] font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Delivering To</dt>
                        <dd>
                          <p className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>{deliveryAddress.full_name}</p>
                          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{deliveryAddress.address_line_1}, {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}</p>
                          <p className="text-[13px] mt-1" style={{ color: 'var(--fg-muted)' }}>Phone: {deliveryAddress.phone}</p>
                        </dd>
                      </div>
                    </div>
                    <button onClick={() => setStep(1)} className="ui-link text-sm">
                      Edit
                    </button>
                  </div>

                  {/* Payment summary */}
                  <div className="ui-card-soft p-4 flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <CreditCard size={18} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
                      <div>
                        <dt className="text-[13px] font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Payment Method</dt>
                        <dd className="text-[15px] font-bold" style={{ color: 'var(--fg)' }}>
                          {paidByPoints ? 'Reward points (paid in full)' : paymentMethod === 'razorpay' ? 'Razorpay (UPI / Cards / NetBanking)' : 'Cash on Delivery (COD)'}
                        </dd>
                      </div>
                    </div>
                    <button onClick={() => setStep(2)} className="ui-link text-sm">
                      Edit
                    </button>
                  </div>
                </dl>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="ui-btn-ghost">
                    Back
                  </button>
                  <button onClick={handlePlaceOrder} disabled={placing || hasBlockingIssues()} className="ui-btn flex-1 !py-4 text-base">
                    <Lock size={16} />
                    {placing
                      ? 'Processing Order…'
                      : paidByPoints
                      ? 'Place Order (paid with points)'
                      : paymentMethod === 'razorpay'
                      ? `Pay Now (${formatPrice(payable)})`
                      : `Place Order (${formatPrice(payable)})`}
                  </button>
                </div>
                <p className="text-[13px] flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>
                  <ShieldCheck size={15} className="flex-shrink-0" style={{ color: 'var(--ok)' }} />
                  {paidByPoints
                    ? 'Your reward points cover this whole order.'
                    : paymentMethod === 'razorpay'
                    ? 'You will complete payment securely on Razorpay. We never see or store your card details.'
                    : 'Pay in cash when your order arrives.'}
                </p>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-28">
            <div className="ui-card p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3 pb-3 mb-1 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="ui-heading text-xl" style={{ color: 'var(--fg)' }}>Order Summary</h3>
                <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                  ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </span>
              </div>

              <ul className="max-h-72 overflow-y-auto mb-4 pr-1">
                {items.map((item) => (
                  <li key={item.cart_item_id || item.id} className="flex gap-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="relative w-14 aspect-[4/5] overflow-hidden flex-shrink-0 rounded-lg"
                      style={{ background: 'var(--surface-2)' }}>
                      <ProductImage src={item.product?.images?.[0]?.url} alt={item.product?.name ?? ''} sizes="56px" />
                      <span className="absolute -top-0 -right-0 min-w-5 h-5 px-1 rounded-bl-lg text-[11px] font-bold flex items-center justify-center"
                        style={{ background: 'var(--fg)', color: 'var(--bg)' }}>{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--fg)' }}>{item.product?.name}</p>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Qty: {item.quantity} · {[item.variant?.size, item.variant?.color].filter(Boolean).join(' / ')}
                      </p>
                      {lineIssues[(item.variant_id || item.variant?.variant_id) as string] && (
                        <p className="text-[13px] mt-1 font-semibold" style={{ color: 'var(--bad)' }}>
                          {lineIssues[(item.variant_id || item.variant?.variant_id) as string]}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--fg)' }}>{formatPrice(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>

              {!orderPlaced && (
                <div className="mb-5 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <CouponPicker subtotal={summary.subtotal} appliedCode={couponCode} onApply={applyCoupon} onRemove={removeCoupon} />
                  {pointsBalance > 0 && (
                    <div className="mt-4">
                      <RewardPointsToggle balance={pointsBalance} applied={pointsApplied} checked={usePoints} onChange={setUsePoints} />
                    </div>
                  )}
                </div>
              )}

              <dl className="space-y-2.5 text-[15px]">
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
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <dt>Subtotal</dt>
                  <dd style={{ color: 'var(--fg)' }}>{formatPrice(summary.subtotal)}</dd>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                    <dt>Discount{couponCode ? ` (${couponCode})` : ''}</dt>
                    <dd className="font-semibold" style={{ color: 'var(--ok)' }}>-{formatPrice(summary.discount)}</dd>
                  </div>
                )}
                {pointsApplied > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                    <dt>Reward points</dt>
                    <dd className="font-semibold" style={{ color: 'var(--ok)' }}>-{formatPrice(pointsApplied)}</dd>
                  </div>
                )}
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <dt>Shipping</dt>
                  <dd className="font-semibold">{summary.shipping === 0 ? <span style={{ color: 'var(--ok)' }}>FREE</span> : <span style={{ color: 'var(--fg)' }}>{formatPrice(summary.shipping)}</span>}</dd>
                </div>
                <div className="flex justify-between items-baseline pt-3.5 mt-1 border-t border-dashed" style={{ borderColor: 'var(--border-strong)', color: 'var(--fg)' }}>
                  <dt className="font-bold">Total Amount</dt>
                  <dd className="ui-heading text-2xl">{formatPrice(payable)}</dd>
                </div>
                <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Inclusive of all taxes</p>
              </dl>

              {totalSavings > 0 && (
                <p className="mt-4 px-4 py-2.5 rounded-xl text-sm font-bold text-center" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
                  🎉 You save {formatPrice(totalSavings)} on this order!
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: ShieldCheck, text: 'Secure payments' },
                { icon: RotateCcw, text: `Easy ${returnDays}-day returns` },
                { icon: Banknote, text: 'COD available' },
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
    </div>
  );
}
