'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, X, Tag, Percent, IndianRupee, Check, Truck, RefreshCw } from 'lucide-react';

type DiscountType = 'percentage' | 'flat' | 'free_shipping';
type CouponType = 'general' | 'welcome' | 'welcome_back' | 'one_time';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  coupon_type: CouponType;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number | null;
  first_order_only: boolean;
  inactive_days_threshold: number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
}

type FormState = {
  code: string;
  description: string;
  coupon_type: CouponType;
  discount_type: DiscountType;
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  first_order_only: boolean;
  inactive_days_threshold: string;
  is_active: boolean;
  valid_from: string;
  valid_to: string;
};

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  coupon_type: 'general',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '',
  max_discount_amount: '',
  max_uses: '',
  max_uses_per_user: '1',
  first_order_only: false,
  inactive_days_threshold: '',
  is_active: true,
  valid_from: '',
  valid_to: '',
};

const COUPON_TYPE_INFO: Record<CouponType, { label: string; desc: string }> = {
  general: { label: 'General', desc: 'Anyone can use' },
  welcome: { label: 'Welcome', desc: 'First order only, 1 use per user' },
  welcome_back: { label: 'Welcome Back', desc: 'Returning customers who haven\'t ordered in N days' },
  one_time: { label: 'One-Time', desc: 'Each user can use once' },
};

const DISCOUNT_TYPE_ICONS: Record<DiscountType, React.ReactNode> = {
  percentage: <Percent size={13} />,
  flat: <IndianRupee size={13} />,
  free_shipping: <Truck size={13} />,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      setCoupons(data.coupons ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? '',
      coupon_type: c.coupon_type,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: String(c.min_order_amount),
      max_discount_amount: c.max_discount_amount ? String(c.max_discount_amount) : '',
      max_uses: c.max_uses ? String(c.max_uses) : '',
      max_uses_per_user: c.max_uses_per_user !== null ? String(c.max_uses_per_user) : '',
      first_order_only: c.first_order_only,
      inactive_days_threshold: c.inactive_days_threshold ? String(c.inactive_days_threshold) : '',
      is_active: c.is_active,
      valid_from: c.valid_from ?? '',
      valid_to: c.valid_to ?? '',
    });
    setSaveError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.discount_value) {
      setSaveError('Coupon code and discount value are required.');
      return;
    }
    setSaving(true);
    setSaveError('');

    const payload = {
      code: form.code.toUpperCase().trim(),
      description: form.description || null,
      coupon_type: form.coupon_type,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order_amount: Number(form.min_order_amount) || 0,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_user: form.max_uses_per_user !== '' ? Number(form.max_uses_per_user) : null,
      first_order_only: form.first_order_only,
      inactive_days_threshold: form.inactive_days_threshold ? Number(form.inactive_days_threshold) : null,
      is_active: form.is_active,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
    };

    try {
      const url = editId ? `/api/admin/coupons/${editId}` : '/api/admin/coupons';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Failed to save coupon.');
        return;
      }
      setShowModal(false);
      fetchCoupons();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon? All usage history will also be lost.')) return;
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    fetchCoupons();
  };

  const toggleStatus = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    fetchCoupons();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalUses = coupons.reduce((sum, c) => sum + c.uses_count, 0);

  const fLabel = (c: Coupon) => {
    if (c.discount_type === 'free_shipping') return 'Free Shipping';
    if (c.discount_type === 'flat') return `₹${c.discount_value} off`;
    return `${c.discount_value}% off${c.max_discount_amount ? ` (max ₹${c.max_discount_amount})` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons & Offers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Create and manage discount codes — changes save to the database in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCoupons} className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Plus size={16} /> New Coupon
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Coupons', value: coupons.length, color: '' },
          { label: 'Active', value: activeCoupons, color: '#22c55e' },
          { label: 'Total Uses', value: totalUses.toLocaleString(), color: '' },
          { label: 'Expired', value: coupons.filter(c => c.valid_to && c.valid_to < new Date().toISOString().split('T')[0]).length, color: '#9ca3af' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="text-2xl font-bold" style={stat.color ? { color: stat.color } : {}}>{stat.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--fg-muted)' }}>
            No coupons yet. Click <strong>New Coupon</strong> to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                {['Code', 'Type', 'Discount', 'Min Order', 'Validity', 'Uses', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const isExpired = coupon.valid_to && coupon.valid_to < new Date().toISOString().split('T')[0];
                const statusLabel = isExpired ? 'Expired' : coupon.is_active ? 'Active' : 'Disabled';
                const statusColor = isExpired ? '#9ca3af' : coupon.is_active ? '#22c55e' : '#ef4444';
                const statusBg = isExpired ? 'rgba(156,163,175,0.12)' : coupon.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';

                return (
                  <tr key={coupon.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--primary)', border: '1px dashed var(--border)' }}>
                          {coupon.code}
                        </span>
                        <button onClick={() => copyCode(coupon.code, coupon.id)} className="p-1 rounded" style={{ color: 'var(--fg-muted)' }}>
                          {copiedId === coupon.id ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
                        </button>
                      </div>
                      {coupon.description && (
                        <div className="text-xs mt-1 truncate max-w-[180px]" style={{ color: 'var(--fg-muted)' }}>{coupon.description}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                        {COUPON_TYPE_INFO[coupon.coupon_type].label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 font-semibold" style={{ color: 'var(--primary)' }}>
                        {DISCOUNT_TYPE_ICONS[coupon.discount_type]}
                        <span className="text-sm">{fLabel(coupon)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-sm">
                      {coupon.min_order_amount > 0 ? `₹${coupon.min_order_amount}` : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {coupon.valid_from || '—'} → {coupon.valid_to || '—'}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-sm">{coupon.uses_count.toLocaleString()}</span>
                      {coupon.max_uses && (
                        <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>/ {coupon.max_uses}</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: statusBg, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        {!isExpired && (
                          <button onClick={() => toggleStatus(coupon)} className="p-1.5 rounded-lg text-xs"
                            style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}
                            title={coupon.is_active ? 'Disable' : 'Enable'}>
                            {coupon.is_active ? '⏸' : '▶'}
                          </button>
                        )}
                        <button onClick={() => openEdit(coupon)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(coupon.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 my-8"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--fg-muted)' }}><X size={20} /></button>
            </div>

            {/* Coupon code */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Coupon Code *</label>
              <input value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME20"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', letterSpacing: '0.08em' }} />
            </div>

            {/* Coupon type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Coupon Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(COUPON_TYPE_INFO) as CouponType[]).map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({
                    ...f, coupon_type: t,
                    first_order_only: t === 'welcome',
                    max_uses_per_user: t === 'general' ? '' : '1',
                  }))}
                    className="text-left px-3 py-2.5 rounded-xl text-xs transition-all"
                    style={{
                      background: form.coupon_type === t ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: form.coupon_type === t ? 'var(--primary-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${form.coupon_type === t ? 'var(--primary)' : 'var(--border)'}`,
                    }}>
                    <div className="font-semibold">{COUPON_TYPE_INFO[t].label}</div>
                    <div className="opacity-70 mt-0.5">{COUPON_TYPE_INFO[t].desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Discount Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['percentage', 'flat', 'free_shipping'] as DiscountType[]).map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, discount_type: t, discount_value: t === 'free_shipping' ? '0' : f.discount_value }))}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: form.discount_type === t ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: form.discount_type === t ? 'var(--primary-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${form.discount_type === t ? 'var(--primary)' : 'var(--border)'}`,
                    }}>
                    {DISCOUNT_TYPE_ICONS[t]}
                    {t === 'percentage' ? 'Percent' : t === 'flat' ? 'Flat ₹' : 'Free Ship'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.discount_type !== 'free_shipping' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {form.discount_type === 'percentage' ? 'Discount (%)' : 'Flat Amount (₹)'} *
                  </label>
                  <input type="number" min="0" max={form.discount_type === 'percentage' ? 100 : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percentage' ? '20' : '150'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Min Order (₹)</label>
                <input type="number" min="0" value={form.min_order_amount}
                  onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {form.discount_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Max Discount Cap (₹)</label>
                  <input type="number" min="0" value={form.max_discount_amount}
                    onChange={(e) => setForm((f) => ({ ...f, max_discount_amount: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Global Max Uses</label>
                <input type="number" min="0" value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Uses Per User</label>
                <input type="number" min="0" value={form.max_uses_per_user}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))}
                  placeholder="1"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </div>
            </div>

            {form.coupon_type === 'welcome_back' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Inactive Days Threshold</label>
                <input type="number" min="1" value={form.inactive_days_threshold}
                  onChange={(e) => setForm((f) => ({ ...f, inactive_days_threshold: e.target.value }))}
                  placeholder="e.g. 90"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
                <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                  User must not have ordered in the last N days to qualify.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Valid From</label>
                <input type="date" value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Valid To</label>
                <input type="date" value={form.valid_to}
                  onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description (internal note)</label>
              <input value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Welcome coupon for first-time buyers"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}>
              <div className="w-10 h-6 rounded-full transition-all relative"
                style={{ background: form.is_active ? 'var(--primary)' : 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                  style={{ background: 'white', left: form.is_active ? 'calc(100% - 22px)' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
              <span className="text-sm font-medium">{form.is_active ? 'Active' : 'Disabled'}</span>
            </label>

            {saveError && <p className="text-sm" style={{ color: '#ef4444' }}>{saveError}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.code || (form.discount_type !== 'free_shipping' && !form.discount_value)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--primary)', color: 'var(--primary-fg)',
                  opacity: (saving || !form.code || (form.discount_type !== 'free_shipping' && !form.discount_value)) ? 0.5 : 1,
                }}>
                {saving
                  ? <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }} />
                  : <><Tag size={15} />{editId ? 'Update Coupon' : 'Create Coupon'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
