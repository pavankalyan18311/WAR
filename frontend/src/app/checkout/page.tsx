'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, CreditCard, CheckCircle, ArrowLeft, ArrowRight, ShieldCheck, Lock, AlertCircle, Banknote, Plus, Truck, Copy, Check, Package } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { items, getSummary, couponCode, clearCart } = useCartStore();
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
  const [paymentId, setPaymentId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [purchasedSummary, setPurchasedSummary] = useState<{ items: any[]; total: number; subtotal: number }>({ items: [], total: 0, subtotal: 0 });
  const summary = getSummary();

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
          const response = await fetch(`/api/addresses?user_id=${user.id}`);
          if (response.ok) {
            const resData = await response.json();
            if (resData.addresses && Array.isArray(resData.addresses)) {
              apiAddresses = resData.addresses.map((item: any) => ({
                id: item.id,
                label: item.is_default ? 'Default' : (item.address_line_2 || 'Saved'),
                fullName: item.full_name || (user as any)?.name || 'Customer',
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
      fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
        .then((r) => r.json())
        .then((d) => {
          if (d && d[0]?.Status === 'Success' && d[0]?.PostOffice?.length > 0) {
            const po = d[0].PostOffice[0];
            const autoCity = po.District || po.Division || po.Name || '';
            const autoState = po.State || '';

            if (target === 'inline') {
              setNewAddr((p) => ({
                ...p,
                city: autoCity || p.city,
                state: autoState || p.state,
              }));
            } else {
              setAddress((p) => ({
                ...p,
                city: autoCity || p.city,
                state: autoState || p.state,
              }));
            }
            setPincodeNotice(`Auto-filled city (${autoCity}) & state (${autoState})`);
          }
        })
        .catch(() => {});
    }
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
    email: address.email || user?.email || '',
    address_line_1: address.address,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: 'India',
  }), [address, user]);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-24 text-center">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--accent)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>Loading Checkout…</p>
      </div>
    );
  }


  const handlePlaceOrder = async () => {
    setPaymentError(null);
    setPlacing(true);

    const generatedRef = `WAR-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      if (items.length === 0) {
        throw new Error('Your cart is empty. Please add items before checking out.');
      }

      // 1. Inventory Stock Check — variant status + actual quantity
      for (const item of items) {
        const variantId = item.variant_id || item.variant?.variant_id || item.variant?.id;
        if (variantId) {
          const { data: varData } = await (supabase as any)
            .from('product_variants')
            .select('status, inventory(quantity, reserved_quantity)')
            .eq('id', variantId)
            .maybeSingle();

          const prodName = item.product?.name || 'Selected Item';
          const sizeStr = item.variant?.size ? ` (${item.variant.size})` : '';

          if (varData?.status === 'inactive') {
            throw new Error(`Sorry, "${prodName}"${sizeStr} is currently out of stock.`);
          }

          const inv = varData?.inventory?.[0] ?? varData?.inventory;
          if (inv) {
            const available = (inv.quantity ?? 0) - (inv.reserved_quantity ?? 0);
            if (available < item.quantity) {
              throw new Error(`Only ${available} unit(s) of "${prodName}"${sizeStr} are available.`);
            }
          }
        }
      }

      // 2. Generate deterministic UUID for Order
      const newOrderId = typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const dbPaymentMethod = paymentMethod === 'razorpay' ? 'card' : paymentMethod === 'cod' ? 'cod' : 'card';

      const orderPayload: any = {
        id: newOrderId,
        status: paymentMethod === 'razorpay' ? 'pending' : 'confirmed',
        subtotal: summary.subtotal,
        discount: summary.discount,
        shipping: summary.shipping,
        tax: summary.tax || 0,
        total: summary.total,
        payment_method: dbPaymentMethod,
        payment_status: paymentMethod === 'razorpay' ? 'pending' : 'pending',
        shipping_address: deliveryAddress,
        coupon_code: couponCode || null,
        user_id: user?.id || null,
      };

      const orderItems = items.map((it) => ({
        id: typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : undefined,
        order_id: newOrderId,
        product_id: it.product?.product_id || it.product?.id,
        variant_id: it.variant_id || it.variant?.variant_id || it.variant?.id,
        quantity: it.quantity,
        unit_price: Number(it.price || 0),
        total_price: Number(it.price || 0) * it.quantity,
      }));

      // ==========================================
      // RAZORPAY PAYMENT FLOW
      // ==========================================
      if (paymentMethod === 'razorpay') {
        const createOrderRes = await fetch('/api/payments/razorpay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: summary.total,
            notes: { order_id: newOrderId, user_id: user?.id || 'guest' },
          }),
        });

        const rzpOrderData = await createOrderRes.json();
        if (!createOrderRes.ok || !rzpOrderData.order_id) {
          throw new Error(rzpOrderData.error || 'Failed to initialize Razorpay checkout.');
        }

        // Dynamically ensure Razorpay SDK script is loaded
        if (typeof window !== 'undefined' && !(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Razorpay SDK script'));
            document.body.appendChild(script);
          });
        }

        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || rzpOrderData.key_id;
        if (!razorpayKey) {
          throw new Error('Payment gateway not configured. Please contact support.');
        }

        const options: any = {
          key: razorpayKey,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency || 'INR',
          name: 'WAR — Without Any Regrets',
          description: `Payment for Order #${generatedRef}`,
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&h=200&fit=crop&auto=format',
          order_id: rzpOrderData.order_id,
          prefill: {
            name: deliveryAddress.full_name || (user as any)?.name || 'Customer',
            email: address.email || user?.email || '',
            contact: deliveryAddress.phone || '',
          },
          notes: {
            address: `${deliveryAddress.address_line_1}, ${deliveryAddress.city}, ${deliveryAddress.state} - ${deliveryAddress.pincode}`,
          },
          theme: {
            color: '#000000',
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/payments/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderPayload: { ...orderPayload, status: 'confirmed', payment_status: 'paid', payment_method: 'razorpay' },
                  orderItems,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                setOrderRef(generatedRef);
                setPaymentId(response.razorpay_payment_id);
                setPurchasedSummary({ items: [...items], total: summary.total, subtotal: summary.subtotal });
                clearCart();
                setOrderPlaced(true);
              } else {
                setPaymentError(verifyData.error || 'Payment verification failed. Please contact support if your account was debited.');
              }
            } catch (vErr: any) {
              setPaymentError(vErr.message || 'Payment verification failed');
            } finally {
              setPlacing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setPlacing(false);
              setPaymentError('Payment modal was closed before completing payment.');
            },
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.on('payment.failed', function (resp: any) {
          setPlacing(false);
          setPaymentError(resp.error?.description || 'Razorpay Payment Failed');
        });

        razorpayInstance.open();
        return;
      }

      // ==========================================
      // CASH ON DELIVERY (COD) FLOW
      // ==========================================
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderPayload, items: orderItems }),
      });

      if (!response.ok) {
        const resErr = await response.json().catch(() => ({}));
        throw new Error(resErr.error || 'Failed to save order to database');
      }

      setOrderRef(generatedRef);
      setPurchasedSummary({ items: [...items], total: summary.total, subtotal: summary.subtotal });
      clearCart();
      setOrderPlaced(true);

    } catch (err: any) {
      console.error('Order placement error:', err);
      setPaymentError(err.message || 'Failed to place order. Please try again.');
    } finally {
      if (paymentMethod !== 'razorpay') {
        setPlacing(false);
      }
    }
  };

  if (orderPlaced) {
    const finalItems = purchasedSummary.items.length > 0 ? purchasedSummary.items : items;
    const finalTotal = purchasedSummary.total || summary.total;

    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 my-auto animate-fade-in flex-1 flex flex-col justify-center w-full">
        {/* Header Hero Banner */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 relative"
            style={{ background: 'rgba(34, 197, 94, 0.12)', border: '2px solid #22c55e', boxShadow: '0 0 35px rgba(34, 197, 94, 0.25)' }}>
            <CheckCircle size={40} style={{ color: '#22c55e' }} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.25em] px-4 py-1 rounded-full inline-block"
            style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            ORDER CONFIRMED
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-3 mb-2 tracking-tight" style={{ color: 'var(--fg)' }}>
            Thank You For Your Order!
          </h1>
          <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            {paymentMethod === 'razorpay'
              ? `Your payment of ${formatPrice(finalTotal)} was verified successfully. We are preparing your order for immediate dispatch.`
              : `Your Cash on Delivery order is confirmed! Please keep ${formatPrice(finalTotal)} ready upon delivery.`}
          </p>
        </div>

        {/* Order Reference Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <Package size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--fg-subtle)' }}>Order Reference ID</p>
              <p className="text-lg font-black font-mono tracking-wide" style={{ color: 'var(--fg)' }}>{orderRef}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCopyRef(orderRef)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
              {copiedRef ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
              {copiedRef ? 'Copied' : 'Copy Ref'}
            </button>
            <span className="text-xs px-3 py-1.5 rounded-full font-extrabold uppercase tracking-wide"
              style={{ background: paymentMethod === 'razorpay' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)', color: paymentMethod === 'razorpay' ? '#22c55e' : '#3b82f6', border: `1px solid ${paymentMethod === 'razorpay' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}` }}>
              {paymentMethod === 'razorpay' ? '✓ Paid (Razorpay)' : 'Cash on Delivery'}
            </span>
          </div>
        </div>

        {/* Order Progress Steps Visual */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--fg-subtle)' }}>Fulfillment Status</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: 'Order Confirmed', status: 'Completed', active: true, icon: CheckCircle },
              { title: 'Warehouse Processing', status: 'In Progress', active: true, icon: Package },
              { title: 'Courier Handover', status: 'Upcoming', active: false, icon: Truck },
              { title: 'Out for Delivery', status: '2–4 Days', active: false, icon: MapPin },
            ].map((st) => (
              <div key={st.title} className="p-3.5 rounded-xl text-left relative overflow-hidden"
                style={{ background: st.active ? 'var(--bg-elevated)' : 'var(--bg-subtle)', border: `1px solid ${st.active ? 'var(--border-strong)' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between mb-2">
                  <st.icon size={18} style={{ color: st.active ? '#22c55e' : 'var(--fg-subtle)' }} />
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ background: st.active ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-card)', color: st.active ? '#22c55e' : 'var(--fg-subtle)' }}>
                    {st.status}
                  </span>
                </div>
                <p className="text-xs font-bold" style={{ color: st.active ? 'var(--fg)' : 'var(--fg-muted)' }}>{st.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Grid for Purchased Items + Delivery Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Purchased Items List */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-black uppercase tracking-wider mb-3 pb-2" style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-subtle)' }}>
              Ordered Items ({finalItems.length})
            </p>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {finalItems.map((it, idx) => (
                <div key={it.cart_item_id || idx} className="flex items-center gap-3 text-xs">
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                    <Image src={it.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300'} alt={it.product?.name || 'Product'} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: 'var(--fg)' }}>{it.product?.name || 'Heavyweight Streetwear Tee'}</p>
                    <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                      Size: {it.variant?.size || 'L'} · Qty: {it.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-xs" style={{ color: 'var(--fg)' }}>{formatPrice((it.price || 0) * it.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 mt-3 flex justify-between items-center text-xs font-bold" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
              <span>Total Amount</span>
              <span className="text-sm font-black">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Delivery & Tracking Details Card */}
          <div className="rounded-2xl p-5 space-y-4 flex flex-col justify-between" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Truck size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fg)' }}>Shiprocket Express Dispatch</p>
              </div>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Estimated Delivery Window: <strong style={{ color: 'var(--fg)' }}>2–4 Business Days</strong></p>
              {paymentId && <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--fg-subtle)' }}>Razorpay Payment ID: {paymentId}</p>}
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--fg)' }}>Delivery Address</p>
              </div>
              <p className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{deliveryAddress.full_name}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                {deliveryAddress.address_line_1}, {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>Contact: {deliveryAddress.phone}</p>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/track-order?order=${orderRef}`}
            className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Truck size={15} /> Track Order Live
          </Link>
          <Link href="/account/orders"
            className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-center"
            style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}>
            View Order History
          </Link>
          <Link href="/products"
            className="py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
            Continue Shopping <ArrowRight size={14} />
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

      {paymentError && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid #ef4444', color: '#ef4444' }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <p className="text-xs font-semibold">{paymentError}</p>
        </div>
      )}

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
              
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-black text-lg" style={{ color: 'var(--fg)' }}>Delivery Address</h2>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    style={{
                      background: showAddAddressForm ? 'var(--bg-elevated)' : 'var(--primary)',
                      color: showAddAddressForm ? 'var(--fg)' : 'var(--primary-fg)',
                      border: showAddAddressForm ? '1px solid var(--border)' : 'none',
                    }}>
                    <Plus size={14} className={showAddAddressForm ? 'rotate-45 transition-transform' : ''} />
                    {showAddAddressForm ? 'Back to Saved Addresses' : 'Add New Address'}
                  </button>
                )}
              </div>

              {/* Pincode Auto-Fill Notice */}
              {pincodeNotice && (
                <div className="mb-4 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                  style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <CheckCircle size={14} />
                  <span>{pincodeNotice}</span>
                </div>
              )}

              {/* Inline Add New Address Form (Triggered when user clicks Add New Address) */}
              {showAddAddressForm && (
                <form onSubmit={handleSaveNewAddress} className="mb-6 p-5 rounded-2xl space-y-4 animate-fade-in"
                  style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--accent)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Add New Delivery Address</h3>
                    <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>Saved to your account</span>
                  </div>

                  {addrError && (
                    <div className="p-3 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      {addrError}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div style={fieldStyle}>
                      <input type="text" placeholder="First Name *" value={newAddr.firstName}
                        onChange={(e) => setNewAddr((p) => ({ ...p, firstName: e.target.value }))} className={inputClass} />
                    </div>
                    <div style={fieldStyle}>
                      <input type="text" placeholder="Last Name" value={newAddr.lastName}
                        onChange={(e) => setNewAddr((p) => ({ ...p, lastName: e.target.value }))} className={inputClass} />
                    </div>
                  </div>

                  <div style={fieldStyle}>
                    <input type="tel" placeholder="Mobile Phone Number *" value={newAddr.phone}
                      onChange={(e) => setNewAddr((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
                  </div>

                  <div style={fieldStyle}>
                    <input type="text" placeholder="Flat, House no., Building, Street *" value={newAddr.addressLine1}
                      onChange={(e) => setNewAddr((p) => ({ ...p, addressLine1: e.target.value }))} className={inputClass} />
                  </div>

                  <div style={fieldStyle}>
                    <input type="text" placeholder="Landmark / Area (Optional)" value={newAddr.addressLine2}
                      onChange={(e) => setNewAddr((p) => ({ ...p, addressLine2: e.target.value }))} className={inputClass} />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div style={fieldStyle}>
                      <input type="text" placeholder="Pincode *" value={newAddr.pincode} maxLength={6}
                        onChange={(e) => handlePincodeAutofill(e.target.value, 'inline')} className={inputClass} />
                    </div>
                    <div style={fieldStyle}>
                      <input type="text" placeholder="City *" value={newAddr.city}
                        onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))} className={inputClass} />
                    </div>
                    <div style={fieldStyle}>
                      <input type="text" placeholder="State *" value={newAddr.state}
                        onChange={(e) => setNewAddr((p) => ({ ...p, state: e.target.value }))} className={inputClass} />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input type="checkbox" checked={newAddr.isDefault}
                      onChange={(e) => setNewAddr((p) => ({ ...p, isDefault: e.target.checked }))}
                      className="w-4 h-4 accent-black rounded cursor-pointer" />
                    <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>Set as default delivery address</span>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowAddAddressForm(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                      style={{ border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={savingAddr}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                      style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                      {savingAddr ? 'Saving Address…' : 'Save & Select Address'}
                    </button>
                  </div>
                </form>
              )}

              {/* Saved Address Cards Grid (Shown when user has saved addresses and form is closed) */}
              {savedAddresses.length > 0 && !showAddAddressForm ? (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addrItem) => {
                      const isSelected = selectedSavedAddressId === addrItem.id;
                      return (
                        <div key={addrItem.id}
                          onClick={() => setSelectedSavedAddressId(addrItem.id)}
                          className="p-4 rounded-xl cursor-pointer transition-all relative flex flex-col justify-between"
                          style={{
                            background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                          }}>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full"
                                style={{
                                  background: addrItem.isDefault ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-subtle)',
                                  color: addrItem.isDefault ? '#22c55e' : 'var(--fg-muted)',
                                }}>
                                {addrItem.isDefault ? 'Default' : addrItem.label || 'Saved'}
                              </span>
                              <div className="w-4 h-4 rounded-full flex items-center justify-center"
                                style={{ border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}` }}>
                                {isSelected && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />}
                              </div>
                            </div>
                            <p className="text-sm font-bold truncate" style={{ color: 'var(--fg)' }}>{addrItem.fullName}</p>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                              {addrItem.addressLine1}{addrItem.addressLine2 ? `, ${addrItem.addressLine2}` : ''}, {addrItem.city}, {addrItem.state} - {addrItem.pincode}
                            </p>
                            <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--fg-subtle)' }}>Phone: {addrItem.phone}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={() => setStep(2)}
                    disabled={!selectedSavedAddressId}
                    className="w-full py-3.5 mt-4 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    Continue to Payment
                  </button>
                </div>
              ) : (
                /* Manual Form for Guest or First-Time Address Entry (NO redundant "+ Add New Address" button in header) */
                !showAddAddressForm && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div style={fieldStyle}>
                        <input type="text" placeholder="First Name *" value={address.firstName}
                          onChange={(e) => setAddress((p) => ({ ...p, firstName: e.target.value }))}
                          className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="text" placeholder="Last Name *" value={address.lastName}
                          onChange={(e) => setAddress((p) => ({ ...p, lastName: e.target.value }))}
                          className={inputClass} />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div style={fieldStyle}>
                        <input type="email" placeholder="Email *" value={address.email}
                          onChange={(e) => setAddress((p) => ({ ...p, email: e.target.value }))}
                          className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="tel" placeholder="Phone *" value={address.phone}
                          onChange={(e) => setAddress((p) => ({ ...p, phone: e.target.value }))}
                          className={inputClass} />
                      </div>
                    </div>

                    <div style={fieldStyle}>
                      <input type="text" placeholder="Flat, House no., Building, Street *" value={address.address}
                        onChange={(e) => setAddress((p) => ({ ...p, address: e.target.value }))}
                        className={inputClass} />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div style={fieldStyle}>
                        <input type="text" placeholder="Pincode *" value={address.pincode} maxLength={6}
                          onChange={(e) => handlePincodeAutofill(e.target.value, 'main')}
                          className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="text" placeholder="City *" value={address.city}
                          onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                          className={inputClass} />
                      </div>
                      <div style={fieldStyle}>
                        <input type="text" placeholder="State *" value={address.state}
                          onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))}
                          className={inputClass} />
                      </div>
                    </div>

                    <button onClick={() => setStep(2)}
                      disabled={!address.firstName || !address.phone || !address.address || !address.pincode}
                      className="w-full py-3.5 mt-2 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                      style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                      Continue to Payment
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="rounded-2xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="font-black mb-5" style={{ color: 'var(--fg)' }}>Select Payment Method</h2>

              <div className="space-y-3 mb-6">
                {PAYMENT_METHODS.map((pm) => {
                  const Icon = pm.icon;
                  const active = paymentMethod === pm.id;
                  return (
                    <div key={pm.id}
                      onClick={() => pm.available && setPaymentMethod(pm.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${pm.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                      style={{
                        background: active ? 'var(--bg-elevated)' : 'transparent',
                        border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <Icon size={18} style={{ color: 'var(--fg)' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{pm.label}</p>
                          {!pm.available && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}>
                              Coming Next
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{pm.desc}</p>
                      </div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}` }}>
                        {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm cursor-pointer"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--fg-muted)' }}>
                  Back
                </button>
                <button onClick={() => setStep(3)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider cursor-pointer"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                  Review Order
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Place Order */}
          {step === 3 && (
            <div className="rounded-2xl p-6 space-y-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <h2 className="font-black" style={{ color: 'var(--fg)' }}>Review & Place Order</h2>

              {/* Delivery info summary */}
              <div className="p-4 rounded-xl flex items-start justify-between"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>Delivering To</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{deliveryAddress.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{deliveryAddress.address_line_1}, {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Phone: {deliveryAddress.phone}</p>
                </div>
                <button onClick={() => setStep(1)} className="text-xs font-bold hover:underline" style={{ color: 'var(--accent)' }}>
                  Edit
                </button>
              </div>

              {/* Payment summary */}
              <div className="p-4 rounded-xl flex items-start justify-between"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>Payment Method</p>
                  <p className="text-sm font-bold uppercase" style={{ color: 'var(--fg)' }}>
                    {paymentMethod === 'razorpay' ? 'Razorpay (UPI / Cards / NetBanking)' : 'Cash on Delivery (COD)'}
                  </p>
                </div>
                <button onClick={() => setStep(2)} className="text-xs font-bold hover:underline" style={{ color: 'var(--accent)' }}>
                  Edit
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm cursor-pointer"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--fg-muted)' }}>
                  Back
                </button>
                <button onClick={handlePlaceOrder} disabled={placing}
                  className="flex-1 py-3.5 rounded-xl font-extrabold text-sm uppercase tracking-wider disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                  <Lock size={15} />
                  {placing
                    ? 'Processing Order…'
                    : paymentMethod === 'razorpay'
                    ? `Pay Now (${formatPrice(summary.total)})`
                    : `Place Order (${formatPrice(summary.total)})`}
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl p-6 sticky top-24"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="font-black text-sm uppercase tracking-wider mb-4 pb-3"
              style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg)' }}>
              Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
              {items.map((item) => (
                <div key={item.cart_item_id || item.id} className="flex gap-3 text-xs">
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)' }}>
                    <Image src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'} alt={item.product?.name || 'Product'} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--fg)' }}>{item.product?.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                      Qty: {item.quantity} · {item.variant?.size} / {item.variant?.color}
                    </p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--fg)' }}>{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs pt-3" style={{ borderTop: '1px solid var(--border)' }}>
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
              <div className="flex justify-between pt-3 font-bold text-sm"
                style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
                <span>Total Amount</span>
                <span className="text-base font-black">{formatPrice(summary.total)}</span>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl flex items-center gap-2 text-[11px]"
              style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--success)' }} className="flex-shrink-0" />
              <span>Safe & Secure Order Processing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
