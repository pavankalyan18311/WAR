'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, MapPin, Package, Heart, LogOut, Plus, Pencil, Trash2, CheckCircle, X, Home, Briefcase, MoreHorizontal, LocateFixed, AlertCircle, Copy, Tag, Check } from 'lucide-react';
import type { Address } from '@/types';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@/lib/supabase/client';

type AddressWithLabel = Address & { label: string };

const COUPONS = [
  { code: 'WAR10', title: '10% OFF Oversized Tees', desc: 'Valid on all Oversized T-Shirts. Min cart ₹999.', expires: 'Valid till 31 Dec' },
  { code: 'WELCOME20', title: '20% OFF First Order', desc: 'Exclusive new member discount on orders above ₹1499.', expires: 'Valid till 31 Dec' },
  { code: 'FREESHIP', title: 'Free Express Shipping', desc: 'Get zero shipping fee on orders above ₹799.', expires: 'Auto-applies' },
];

const LABEL_ICONS: Record<string, React.ElementType> = {
  Home: Home,
  Work: Briefcase,
  Other: MoreHorizontal,
};

const INDIA_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

type AddressWithLabel = Address & { label: string };
type FormState = Partial<AddressWithLabel> & { label: string };

const EMPTY_FORM: FormState = {
  label: 'Home', full_name: '', phone: '', address_line_1: '', address_line_2: '',
  city: '', state: 'Karnataka', pincode: '', country: 'India',
};

const NAV_LINKS = [
  { href: '/account/profile', label: 'Profile & Addresses', icon: User, active: true },
  { href: '/account/orders', label: 'My Orders', icon: Package },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

type ReverseGeocodeResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    road?: string;
    suburb?: string;
  };
};

export default function AccountProfilePage() {
  const { user, isAuthenticated, logout, updateProfile } = useAuthStore();
  const [addresses, setAddresses] = useState<AddressWithLabel[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');

  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dob: '',
  });
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  // Fetch live addresses & rewards from Supabase
  useEffect(() => {
    async function loadUserData() {
      if (!user?.id) {
        setLoadingAddresses(false);
        return;
      }
      const supabase = createClient();

      // Load Addresses via /api/addresses
      try {
        const response = await fetch(`/api/addresses?user_id=${user.id}`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.addresses && Array.isArray(resData.addresses)) {
            const mapped: AddressWithLabel[] = resData.addresses.map((a: any) => ({
              address_id: a.id,
              label: a.address_line_2 && ['Home', 'Work'].includes(a.address_line_2) ? a.address_line_2 : 'Home',
              full_name: a.full_name,
              phone: a.phone,
              address_line_1: a.address_line_1,
              address_line_2: a.address_line_2,
              city: a.city,
              state: a.state,
              pincode: a.pincode,
              country: a.country ?? 'India',
              is_default: a.is_default ?? false,
            }));
            setAddresses(mapped);
          }
        }
      } catch (e) {
        console.error('Failed to load addresses', e);
      } finally {
        setLoadingAddresses(false);
      }

      // Calculate reward points from user orders (5 points per ₹100 spent)
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('total')
          .eq('user_id', user.id);

        if (orderData && orderData.length > 0) {
          const totalSpent = orderData.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
          setRewardPoints(Math.floor((totalSpent / 100) * 5));
        } else {
          setRewardPoints(0);
        }
      } catch (e) {
        console.error('Failed to calculate reward points', e);
      }
    }

    loadUserData();
  }, [user?.id]);

  const openProfileModal = () => {
    const meta = user?.user_metadata || {};
    const nameParts = (meta.name || (user as any)?.name || '').split(' ');
    setProfileForm({
      firstName: meta.first_name || nameParts[0] || '',
      lastName: meta.last_name || nameParts.slice(1).join(' ') || '',
      phone: user?.phone || meta.phone || '',
      dob: meta.dob || '',
    });
    setProfileError('');
    setProfileSuccess(false);
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.firstName.trim()) {
      setProfileError('First name is required.');
      return;
    }
    try {
      setProfileUpdating(true);
      setProfileError('');
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        dob: profileForm.dob,
      });
      setProfileSuccess(true);
      setTimeout(() => {
        setProfileSuccess(false);
        setShowProfileModal(false);
      }, 1200);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileUpdating(false);
    }
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, full_name: user?.user_metadata?.name || `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || '' });
    setEditing(null);
    setLocationError('');
    setLocationSuccess('');
    setShowForm(true);
  };

  const openEdit = (addr: AddressWithLabel) => {
    setForm({ ...addr });
    setEditing(addr.address_id ?? null);
    setLocationError('');
    setLocationSuccess('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setLocationError('');
    setLocationSuccess('');
    setLocationLoading(false);
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));

    // Auto-fill City & State on 6-digit Pincode entry
    if (key === 'pincode') {
      const cleanPin = value.replace(/\D/g, '').slice(0, 6);
      if (cleanPin.length === 6) {
        fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
              const po = data[0].PostOffice[0];
              const city = po.District || po.Division || po.Name || '';
              const state = po.State || '';
              setForm((f) => ({
                ...f,
                city: city || f.city,
                state: state || f.state,
              }));
              setLocationSuccess(`Auto-filled city (${city}) & state (${state}) for pincode ${cleanPin}`);
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.address_line_1 || !form.city || !form.pincode) {
      setLocationError('Please fill in all required address fields marked with *');
      return;
    }

    if (!user?.id) {
      setLocationError('You must be logged in to save an address.');
      return;
    }

    try {
      const payload = {
        user_id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2 || null,
        city: form.city,
        state: form.state || 'Karnataka',
        pincode: form.pincode,
        country: form.country ?? 'India',
        is_default: addresses.length === 0,
      };

      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok && resData.address) {
        const savedItem: AddressWithLabel = {
          address_id: resData.address.id || `addr-${Date.now()}`,
          label: form.label || 'Home',
          full_name: resData.address.full_name,
          phone: resData.address.phone,
          address_line_1: resData.address.address_line_1,
          address_line_2: resData.address.address_line_2,
          city: resData.address.city,
          state: resData.address.state,
          pincode: resData.address.pincode,
          country: resData.address.country,
          is_default: resData.address.is_default,
        };

        if (editing) {
          setAddresses((prev) => prev.map((a) => a.address_id === editing ? savedItem : a));
        } else {
          setAddresses((prev) => [savedItem, ...prev]);
        }
        setSaved(true);
        setTimeout(() => { setSaved(false); closeForm(); }, 1200);
      } else {
        setLocationError(resData.error || 'Failed to save address to database.');
      }
    } catch (e: any) {
      console.error('Failed to save address', e);
      setLocationError(e.message || 'Failed to save address.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/addresses?id=${id}&user_id=${user?.id || ''}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete address', e);
    }
    setAddresses((prev) => prev.filter((a) => a.address_id !== id));
  };

  const setDefault = async (id: string) => {
    if (!user?.id) return;
    try {
      await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          is_default: true,
          ...addresses.find((a) => a.address_id === id),
        }),
      });
    } catch (e) {
      console.error('Failed to update default address', e);
    }
    setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.address_id === id })));
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<ReverseGeocodeResponse> => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error('Unable to fetch location details.');
    }
    return res.json();
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }

    setLocationError('');
    setLocationSuccess('');
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await reverseGeocode(latitude, longitude);
          const addr = data.address;
          const city = addr?.city || addr?.town || addr?.village || '';
          const state = addr?.state || '';
          const pincode = (addr?.postcode || '').replace(/\D/g, '').slice(0, 6);
          const lineHint = [addr?.road, addr?.suburb].filter(Boolean).join(', ');

          setForm((prev) => ({
            ...prev,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode || prev.pincode,
            address_line_2: !prev.address_line_2 && lineHint ? lineHint : prev.address_line_2,
          }));

          if (city || state || pincode) {
            setLocationSuccess('Location detected. City, state, and pincode autofilled.');
          } else {
            setLocationError('Location found, but could not auto-fill all fields.');
          }
        } catch {
          setLocationError('Could not reverse geocode your location. Please enter details manually.');
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Enable it and try again.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable. Try again in a better network area.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please retry.');
        } else {
          setLocationError('Unable to access your location right now.');
        }
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  const displayName = user?.name || 'Guest User';
  const displayEmail = user?.email || 'guest@war.in';
  const displayPhone = user?.phone ? `+91 ${user.phone}` : 'Not added';
  const displayDob = user?.dob || 'Not added';
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'This Session';

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--accent)' }}>Account</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              {(user?.first_name?.[0] || user?.name?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black" style={{ color: 'var(--fg)' }}>{displayName}</h1>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-b overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex px-5 py-2.5 gap-2 min-w-max">
          {NAV_LINKS.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                color: active ? 'var(--primary-fg)' : 'var(--fg-muted)',
                border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
              }}>
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-48 flex-shrink-0">
            <nav className="space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon, active }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    border: active ? '1px solid var(--border)' : '1px solid transparent',
                  }}>
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                onClick={async () => {
                  await logout();
                }}
                style={{ color: 'var(--danger)' }}>
                <LogOut size={15} />
                Sign Out
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Profile card */}
            <ScrollReveal animation="fade-up">
              <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-base" style={{ color: 'var(--fg)' }}>Personal Information</h2>
                  <button onClick={openProfileModal} className="text-xs font-semibold hover:opacity-70 flex items-center gap-1"
                    style={{ color: 'var(--accent)' }}>
                    <Pencil size={12} /> Edit
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'First Name', value: user?.user_metadata?.first_name || displayName.split(' ')[0] || 'Not added' },
                    { label: 'Last Name', value: user?.user_metadata?.last_name || displayName.split(' ').slice(1).join(' ') || 'Not added' },
                    { label: 'Mobile Number', value: displayPhone },
                    { label: 'Email Address', value: displayEmail },
                    { label: 'Date of Birth', value: displayDob },
                    { label: 'Member Since', value: joined },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                      <p className="font-semibold" style={{ color: 'var(--fg)' }}>{value}</p>
                    </div>
                  ))}
                </div>



                {!isAuthenticated && (
                  <p className="mt-4 text-xs" style={{ color: 'var(--warning)' }}>
                    You are viewing guest mode data. Complete OTP login to unlock your real account details.
                  </p>
                )}
              </div>
            </ScrollReveal>

            {/* Addresses */}
            <ScrollReveal animation="fade-up" delay={80}>
              <div id="addresses">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-base" style={{ color: 'var(--fg)' }}>Saved Addresses</h2>
                  <button onClick={openAdd}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    <Plus size={13} /> Add New
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => {
                    const Icon = LABEL_ICONS[addr.label] ?? MoreHorizontal;
                    return (
                      <div key={addr.address_id} className="relative rounded-2xl p-4"
                        style={{
                          background: 'var(--bg-card)',
                          border: `1.5px solid ${addr.is_default ? 'var(--primary)' : 'var(--border)'}`,
                        }}>
                        {addr.is_default && (
                          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                            Default
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--bg-elevated)' }}>
                            <Icon size={14} style={{ color: 'var(--accent)' }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{addr.label}</span>
                        </div>
                        <div className="text-sm space-y-0.5" style={{ color: 'var(--fg-muted)' }}>
                          <p className="font-semibold" style={{ color: 'var(--fg)' }}>{addr.full_name}</p>
                          <p>{addr.phone}</p>
                          <p>{addr.address_line_1}</p>
                          {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                          <p>{addr.city}, {addr.state} – {addr.pincode}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                          <button onClick={() => openEdit(addr)}
                            className="flex items-center gap-1 text-xs font-semibold hover:opacity-70"
                            style={{ color: 'var(--fg-muted)' }}>
                            <Pencil size={11} /> Edit
                          </button>
                          {!addr.is_default && (
                            <>
                              <span style={{ color: 'var(--border)' }}>·</span>
                              <button onClick={() => setDefault(addr.address_id!)}
                                className="flex items-center gap-1 text-xs font-semibold hover:opacity-70"
                                style={{ color: 'var(--accent)' }}>
                                <CheckCircle size={11} /> Set Default
                              </button>
                              <span style={{ color: 'var(--border)' }}>·</span>
                              <button onClick={() => handleDelete(addr.address_id!)}
                                className="flex items-center gap-1 text-xs font-semibold hover:opacity-70"
                                style={{ color: 'var(--danger)' }}>
                                <Trash2 size={11} /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add address card */}
                  <button onClick={openAdd}
                    className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[160px] transition-all hover:opacity-70"
                    style={{ border: '1.5px dashed var(--border)', background: 'transparent' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'var(--bg-elevated)' }}>
                      <Plus size={18} style={{ color: 'var(--fg-muted)' }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>Add New Address</p>
                  </button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={120}>
              <div id="rewards" className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h2 className="font-black text-base" style={{ color: 'var(--fg)' }}>Rewards & Coupons</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                  Earn 5 points for every Rs.100 spent. Exclusive member offers will appear here.
                </p>
                <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--fg-muted)' }}>Reward Points</p>
                    <p className="text-2xl font-black mt-1" style={{ color: 'var(--accent)' }}>{rewardPoints}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>Earn 5 points for every ₹100 spent</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--fg-muted)' }}>Available Coupons</p>
                    <p className="text-2xl font-black mt-1" style={{ color: 'var(--fg)' }}>{COUPONS.length}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--fg-muted)' }}>Active discounts for your account</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--fg-muted)' }}>Active Offers & Promo Codes</p>
                  <div className="grid gap-3">
                    {COUPONS.map((coupon) => (
                      <div key={coupon.code}
                        className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 transition-all"
                        style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(234, 179, 8, 0.12)', color: '#eab308' }}>
                            <Tag size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm" style={{ color: 'var(--fg)' }}>{coupon.code}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>{coupon.expires}</span>
                            </div>
                            <p className="font-semibold text-xs mt-0.5" style={{ color: 'var(--fg)' }}>{coupon.title}</p>
                            <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{coupon.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyCoupon(coupon.code)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 hover:opacity-90"
                          style={{
                            background: copiedCoupon === coupon.code ? '#22c55e' : 'var(--primary)',
                            color: 'var(--primary-fg)',
                          }}
                        >
                          {copiedCoupon === coupon.code ? (
                            <>
                              <Check size={12} /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy Code
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={closeForm} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-base" style={{ color: 'var(--fg)' }}>
                {editing ? 'Edit Address' : 'Add New Address'}
              </h3>
              <button onClick={closeForm} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
            </div>

            {saved ? (
              <div className="flex flex-col items-center py-10">
                <CheckCircle size={40} style={{ color: '#22c55e' }} className="mb-3" />
                <p className="font-bold text-base" style={{ color: 'var(--fg)' }}>Address saved!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl p-3.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg)' }}>Current Location</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Auto-fill city, state, and pincode from your device location.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locationLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
                      style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                    >
                      <LocateFixed size={13} className={locationLoading ? 'animate-spin' : ''} />
                      {locationLoading ? 'Detecting...' : 'Use Current Location'}
                    </button>
                  </div>
                  {locationSuccess && (
                    <p className="text-[11px] mt-2 font-medium" style={{ color: 'var(--success)' }}>
                      {locationSuccess}
                    </p>
                  )}
                  {locationError && (
                    <p className="text-[11px] mt-2 font-medium flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                      <AlertCircle size={12} /> {locationError}
                    </p>
                  )}
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--fg)' }}>Label</label>
                  <div className="flex gap-2">
                    {(['Home', 'Work', 'Other'] as const).map((l) => {
                      const LIcon = LABEL_ICONS[l];
                      return (
                        <button key={l} onClick={() => setField('label', l)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all"
                          style={{
                            background: form.label === l ? 'var(--primary)' : 'var(--bg-elevated)',
                            color: form.label === l ? 'var(--primary-fg)' : 'var(--fg-muted)',
                            border: `1px solid ${form.label === l ? 'var(--primary)' : 'var(--border)'}`,
                          }}>
                          <LIcon size={12} /> {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Full Name *</label>
                    <input value={form.full_name ?? ''} onChange={(e) => setField('full_name', e.target.value)}
                      placeholder="Recipient's name" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Phone *</label>
                    <input value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)}
                      placeholder="+91 98765 43210" type="tel" className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Address Line 1 *</label>
                  <input value={form.address_line_1 ?? ''} onChange={(e) => setField('address_line_1', e.target.value)}
                    placeholder="House / Flat no, Building name, Street" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Address Line 2 <span style={{ color: 'var(--fg-subtle)' }}>(optional)</span></label>
                  <input value={form.address_line_2 ?? ''} onChange={(e) => setField('address_line_2', e.target.value)}
                    placeholder="Area, Landmark" className="input-field" />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Pincode *</label>
                    <input value={form.pincode ?? ''} onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="560001" maxLength={6} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>City *</label>
                    <input value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)}
                      placeholder="Bengaluru" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>State *</label>
                    <select value={form.state ?? 'Karnataka'} onChange={(e) => setField('state', e.target.value)}
                      className="input-field cursor-pointer">
                      {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={closeForm}
                    className="flex-1 py-3 rounded-xl font-bold text-sm border"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                    {editing ? 'Save Changes' : 'Add Address'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowProfileModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-base" style={{ color: 'var(--fg)' }}>Edit Profile Details</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
            </div>

            {profileSuccess ? (
              <div className="flex flex-col items-center py-8">
                <CheckCircle size={40} style={{ color: '#22c55e' }} className="mb-3 animate-bounce" />
                <p className="font-bold text-base" style={{ color: 'var(--fg)' }}>Profile updated successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profileError && (
                  <div className="p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                    <AlertCircle size={14} />
                    {profileError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>First Name *</label>
                    <input
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="First Name"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Last Name</label>
                    <input
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last Name"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Mobile Phone</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="10-digit mobile number"
                    type="tel"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>Date of Birth</label>
                  <input
                    value={profileForm.dob}
                    onChange={(e) => setProfileForm((f) => ({ ...f, dob: e.target.value }))}
                    type="date"
                    className="input-field cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm border"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileUpdating}
                    className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                  >
                    {profileUpdating ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
