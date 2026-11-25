'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, CheckCircle, X, Home, Briefcase, MoreHorizontal, AlertCircle } from 'lucide-react';
import type { Address } from '@/types';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { useAuthStore } from '@/store/authStore';
import { getUserDisplayInfo } from '@/lib/userDisplay';
import { fetchPincodeInfo, type LocatedAddress } from '@/lib/geoClient';
import UseLocationButton from '@/components/address/UseLocationButton';
import { AccountSection, AccountShell } from '@/components/account/AccountShell';
import RewardsPanel from '@/components/account/RewardsPanel';

type AddressWithLabel = Address & { label: string };
type FormState = Partial<AddressWithLabel> & { label: string };

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

const EMPTY_FORM: FormState = {
  label: 'Home', full_name: '', phone: '', address_line_1: '', address_line_2: '',
  city: '', state: 'Karnataka', pincode: '', country: 'India',
};


export default function AccountProfilePage() {
  const { user, isAuthenticated, logout, updateProfile } = useAuthStore();
  const [addresses, setAddresses] = useState<AddressWithLabel[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
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
  // Fetch live addresses & rewards from Supabase
  useEffect(() => {
    async function loadUserData() {
      if (!user?.id) {
        setLoadingAddresses(false);
        return;
      }
      // Load Addresses via /api/addresses
      try {
        const response = await fetch('/api/addresses');
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
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));

    // Auto-fill City & State on 6-digit Pincode entry
    if (key === 'pincode') {
      const cleanPin = value.replace(/\D/g, '').slice(0, 6);
      if (cleanPin.length === 6) {
        fetchPincodeInfo(cleanPin).then((info) => {
          if (!info) return;
          setForm((f) => ({ ...f, city: info.city || f.city, state: info.state || f.state }));
          setLocationSuccess(`Auto-filled city (${info.city}) & state (${info.state}) for pincode ${cleanPin}`);
        });
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
      const existing = editing ? addresses.find((a) => a.address_id === editing) : undefined;
      const payload = {
        id: editing || undefined,
        full_name: form.full_name,
        phone: form.phone,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2 || null,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        country: form.country ?? 'India',
        is_default: existing ? existing.is_default : addresses.length === 0,
      };

      const res = await fetch('/api/addresses', {
        method: editing ? 'PATCH' : 'POST',
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
      const res = await fetch(`/api/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete address.');
      setAddresses((prev) => prev.filter((a) => a.address_id !== id));
    } catch (e: any) {
      console.error('Failed to delete address', e);
      setLocationError(e.message || 'Failed to delete address.');
    }
  };

  const setDefault = async (id: string) => {
    const target = addresses.find((a) => a.address_id === id);
    if (!user?.id || !target) return;
    try {
      const res = await fetch('/api/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, id, is_default: true }),
      });
      if (!res.ok) throw new Error('Failed to update default address.');
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.address_id === id })));
    } catch (e: any) {
      console.error('Failed to update default address', e);
      setLocationError(e.message || 'Failed to update default address.');
    }
  };

  const applyDetectedAddress = (a: LocatedAddress) => {
    setLocationError('');
    setForm((prev) => ({
      ...prev,
      address_line_1: prev.address_line_1 || a.line1,
      address_line_2: prev.address_line_2 || a.area,
      city: a.city || prev.city,
      state: INDIA_STATES.includes(a.state) ? a.state : prev.state,
      pincode: a.pincode || prev.pincode,
    }));
    setLocationSuccess('Location found — please check the house/flat number before saving.');
  };

  const info = user ? getUserDisplayInfo(user) : null;
  const displayName = info?.name ?? '';
  const displayEmail = info?.email ?? '';
  const displayPhone = info?.phone ? `+91 ${info.phone}` : 'Not added';
  const displayDob = info?.dob || 'Not added';
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'This Session';

  const firstName = (user?.user_metadata?.first_name || displayName.split(' ')[0] || '').trim();
  const modalPanel = 'relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-7 border rounded-t-3xl sm:rounded-3xl shadow-2xl';
  const modalStyle = { background: 'var(--surface)', borderColor: 'var(--border)' };
  const labelCls = 'block text-sm font-semibold mb-1.5';

  return (
    <AccountShell
      active="profile"
      eyebrow="Your account"
      title={firstName ? <>Hello, <span style={{ color: 'var(--brand)' }}>{firstName}.</span></> : 'Your account'}
      subtitle={displayEmail || undefined}
      onLogout={async () => { await logout(); }}
    >
      <div className="space-y-5">
        {/* 01 — Profile */}
        <ScrollReveal animation="fade-up">
          <AccountSection index="01" title="Personal details"
            action={
              <button onClick={openProfileModal} className="ui-btn-ghost !py-2 !px-4 text-sm">
                <Pencil size={14} /> Edit
              </button>
            }>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'First Name', value: user?.user_metadata?.first_name || displayName.split(' ')[0] || 'Not added' },
                { label: 'Last Name', value: user?.user_metadata?.last_name || displayName.split(' ').slice(1).join(' ') || 'Not added' },
                { label: 'Mobile Number', value: displayPhone },
                { label: 'Email Address', value: displayEmail },
                { label: 'Date of Birth', value: displayDob },
                { label: 'Member Since', value: joined },
              ].map(({ label, value }) => (
                <div key={label} className="ui-card-soft px-4 py-3">
                  <dt className="text-xs font-medium mb-0.5" style={{ color: 'var(--fg-muted)' }}>{label}</dt>
                  <dd className="text-[15px] font-semibold break-words" style={{ color: value === 'Not added' ? 'var(--fg-subtle)' : 'var(--fg)' }}>{value}</dd>
                </div>
              ))}
            </dl>

            {!isAuthenticated && (
              <p className="mt-5 text-sm rounded-xl px-4 py-3" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
                You are viewing guest mode data. Complete OTP login to unlock your real account details.
              </p>
            )}
          </AccountSection>
        </ScrollReveal>

        {/* 02 — Addresses */}
        <ScrollReveal animation="fade-up" delay={80}>
          <AccountSection id="addresses" index="02" title="Saved addresses"
            action={
              <button onClick={openAdd} className="ui-btn !py-2 !px-4 text-sm">
                <Plus size={15} /> Add new
              </button>
            }>
            {locationError && !showForm && (
              <p role="alert" className="mb-5 text-sm rounded-xl px-4 py-3" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>{locationError}</p>
            )}

            {loadingAddresses ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1].map((i) => <div key={i} className="h-48 skeleton rounded-2xl" />)}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addresses.map((addr) => {
                  const LIcon = LABEL_ICONS[addr.label] ?? MoreHorizontal;
                  return (
                  <article key={addr.address_id} className="relative rounded-2xl border-[1.5px] p-5 flex flex-col"
                    style={{ borderColor: addr.is_default ? 'var(--brand)' : 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="ui-chip" style={{ background: 'var(--surface-2)', color: 'var(--fg)' }}>
                        <LIcon size={13} /> {addr.label}
                      </span>
                      {addr.is_default && (
                        <span className="ui-chip ui-chip-brand">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold leading-snug" style={{ color: 'var(--fg)' }}>{addr.full_name}</p>
                    <div className="text-sm mt-1.5 leading-relaxed flex-1" style={{ color: 'var(--fg-muted)' }}>
                      <p>{addr.address_line_1}</p>
                      {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                      <p>{addr.city}, {addr.state} — {addr.pincode}</p>
                      <p className="mt-2 font-medium" style={{ color: 'var(--fg)' }}>{addr.phone}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-3.5 border-t text-sm font-semibold"
                      style={{ borderColor: 'var(--border)' }}>
                      <button onClick={() => openEdit(addr)} className="hover:underline" style={{ color: 'var(--brand)' }}>Edit</button>
                      {!addr.is_default && (
                        <>
                          <button onClick={() => setDefault(addr.address_id!)} className="hover:text-[var(--fg)]" style={{ color: 'var(--fg-muted)' }}>
                            Set default
                          </button>
                          <button onClick={() => handleDelete(addr.address_id!)} className="hover:text-[var(--bad)]" style={{ color: 'var(--fg-muted)' }}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                  );
                })}

                <button onClick={openAdd}
                  className="rounded-2xl border-2 border-dashed p-5 min-h-[180px] flex flex-col items-center justify-center gap-3 transition-colors hover:border-[var(--brand)]"
                  style={{ borderColor: 'var(--border-strong)' }}>
                  <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                    <Plus size={20} />
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Add new address</span>
                </button>
              </div>
            )}
          </AccountSection>
        </ScrollReveal>

        {/* 03 — Reward points */}
        <ScrollReveal animation="fade-up" delay={120}>
          <AccountSection id="rewards" index="03" title="Reward points">
            <RewardsPanel />
          </AccountSection>
        </ScrollReveal>
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(22,20,18,0.5)' }} onClick={closeForm} />
          <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit address' : 'Add new address'} className={modalPanel} style={modalStyle}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--brand)' }}>Address book</p>
                <h3 className="ui-heading text-2xl leading-tight" style={{ color: 'var(--fg)' }}>{editing ? 'Edit Address' : 'Add New Address'}</h3>
              </div>
              <button onClick={closeForm} aria-label="Close" style={{ color: 'var(--fg-muted)' }}><X size={20} /></button>
            </div>

            {saved ? (
              <div className="flex flex-col items-center py-12">
                <CheckCircle size={36} style={{ color: 'var(--ok)' }} className="mb-3" />
                <p className="ui-heading text-xl" style={{ color: 'var(--fg)' }}>Address saved!</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm max-w-[16rem]" style={{ color: 'var(--fg-muted)' }}>
                    Auto-fill city, state, and pincode from your device location.
                  </p>
                  <UseLocationButton onDetected={applyDetectedAddress} fallbackFieldId="account-address-line1" />
                </div>
                {locationSuccess && (
                  <p className="text-sm rounded-xl px-4 py-3" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>{locationSuccess}</p>
                )}
                {locationError && (
                  <p role="alert" className="text-sm rounded-xl px-4 py-3 flex items-center gap-1.5" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
                    <AlertCircle size={12} /> {locationError}
                  </p>
                )}

                {/* Label */}
                <div>
                  <span className={labelCls} style={{ color: 'var(--fg-muted)' }}>Label</span>
                  <div className="flex flex-wrap gap-2">
                    {(['Home', 'Work', 'Other'] as const).map((l) => {
                      const LIcon = LABEL_ICONS[l];
                      const on = form.label === l;
                      return (
                        <button key={l} type="button" onClick={() => setField('label', l)} aria-pressed={on}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-colors"
                          style={on
                            ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: 'var(--brand-fg)' }
                            : { background: 'var(--surface)', borderColor: 'var(--border-strong)', color: 'var(--fg-muted)' }}>
                          <LIcon size={12} /> {l}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Full Name *</label>
                    <input name="name" autoComplete="shipping name" aria-label="Full name" value={form.full_name ?? ''} onChange={(e) => setField('full_name', e.target.value)}
                      placeholder="Recipient's name" className="ui-input" />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Phone *</label>
                    <input name="tel" autoComplete="shipping tel" inputMode="tel" aria-label="Phone" value={form.phone ?? ''} onChange={(e) => setField('phone', e.target.value)}
                      placeholder="+91 98765 43210" type="tel" className="ui-input" />
                  </div>
                </div>

                <div>
                  <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Address Line 1 *</label>
                  <input id="account-address-line1" name="address-line1" autoComplete="shipping address-line1" aria-label="Address line 1" value={form.address_line_1 ?? ''} onChange={(e) => setField('address_line_1', e.target.value)}
                    placeholder="House / Flat no, Building name, Street" className="ui-input" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Address Line 2 <span style={{ color: 'var(--fg-subtle)' }}>(optional)</span></label>
                  <input name="address-line2" autoComplete="shipping address-line2" aria-label="Address line 2" value={form.address_line_2 ?? ''} onChange={(e) => setField('address_line_2', e.target.value)}
                    placeholder="Area, Landmark" className="ui-input" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Pincode *</label>
                    <input name="postal-code" autoComplete="shipping postal-code" inputMode="numeric" aria-label="Pincode" value={form.pincode ?? ''} onChange={(e) => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="560001" maxLength={6} className="ui-input" />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>City *</label>
                    <input name="address-level2" autoComplete="shipping address-level2" aria-label="City" value={form.city ?? ''} onChange={(e) => setField('city', e.target.value)}
                      placeholder="Bengaluru" className="ui-input" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>State *</label>
                    <select name="address-level1" autoComplete="shipping address-level1" aria-label="State" value={form.state ?? 'Karnataka'} onChange={(e) => setField('state', e.target.value)}
                      className="ui-input cursor-pointer">
                      {INDIA_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button onClick={closeForm} className="ui-btn-ghost flex-1">Cancel</button>
                  <button onClick={handleSave} className="ui-btn flex-1">{editing ? 'Save Changes' : 'Add Address'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(22,20,18,0.5)' }} onClick={() => setShowProfileModal(false)} />
          <div role="dialog" aria-modal="true" aria-label="Edit profile details" className={`${modalPanel} sm:max-w-md`} style={modalStyle}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--brand)' }}>Your account</p>
                <h3 className="ui-heading text-2xl leading-tight" style={{ color: 'var(--fg)' }}>Edit Profile Details</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} aria-label="Close" style={{ color: 'var(--fg-muted)' }}><X size={20} /></button>
            </div>

            {profileSuccess ? (
              <div className="flex flex-col items-center py-10">
                <CheckCircle size={36} style={{ color: 'var(--ok)' }} className="mb-3" />
                <p className="ui-heading text-xl" style={{ color: 'var(--fg)' }}>Profile updated successfully!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {profileError && (
                  <p role="alert" className="text-sm rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
                    <AlertCircle size={13} /> {profileError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>First Name *</label>
                    <input value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="First Name" autoComplete="given-name" className="ui-input" />
                  </div>
                  <div>
                    <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Last Name</label>
                    <input value={profileForm.lastName} onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last Name" autoComplete="family-name" className="ui-input" />
                  </div>
                </div>

                <div>
                  <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Mobile Phone</label>
                  <input value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="10-digit mobile number" type="tel" inputMode="tel" autoComplete="tel" className="ui-input" />
                </div>

                <div>
                  <label className={labelCls} style={{ color: 'var(--fg-muted)' }}>Date of Birth</label>
                  <input value={profileForm.dob} onChange={(e) => setProfileForm((f) => ({ ...f, dob: e.target.value }))}
                    type="date" className="ui-input cursor-pointer" />
                </div>

                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowProfileModal(false)} className="ui-btn-ghost flex-1">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={profileUpdating} className="ui-btn flex-1">
                    {profileUpdating ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AccountShell>
  );
}
