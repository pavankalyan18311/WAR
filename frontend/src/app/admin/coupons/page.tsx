'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, X, Save, Tag, Percent, IndianRupee, Check } from 'lucide-react';

type DiscountType = 'percentage' | 'flat';
type CouponStatus = 'Active' | 'Expired' | 'Scheduled' | 'Disabled';

interface Coupon {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  min_order: number;
  max_discount?: number;
  uses: number;
  max_uses?: number;
  status: CouponStatus;
  valid_from: string;
  valid_to: string;
  description: string;
  first_time_only: boolean;
}

const INITIAL_COUPONS: Coupon[] = [
  { id: 'cp-war10', code: 'WAR10', type: 'percentage', value: 10, min_order: 499, uses: 512, status: 'Active', valid_from: '2026-01-01', valid_to: '2026-12-31', description: '10% off site-wide on orders above ₹499', first_time_only: false },
  { id: 'cp-wel20', code: 'WELCOME20', type: 'percentage', value: 20, min_order: 999, max_discount: 400, uses: 320, max_uses: 1000, status: 'Active', valid_from: '2026-01-01', valid_to: '2026-12-31', description: '20% off for new customers on orders above ₹999', first_time_only: true },
  { id: 'cp1', code: 'WELCOME10', type: 'percentage', value: 10, min_order: 500, uses: 1240, max_uses: undefined, status: 'Active', valid_from: '2026-01-01', valid_to: '2026-12-31', description: 'Welcome discount for new users', first_time_only: true },
  { id: 'cp2', code: 'SUMMER20', type: 'percentage', value: 20, min_order: 999, max_discount: 300, uses: 432, max_uses: 1000, status: 'Active', valid_from: '2026-06-01', valid_to: '2026-08-31', description: 'Summer sale offer', first_time_only: false },
  { id: 'cp3', code: 'FLAT150', type: 'flat', value: 150, min_order: 1299, uses: 89, status: 'Active', valid_from: '2026-05-01', valid_to: '2026-06-30', description: 'Flat ₹150 off on orders above ₹1299', first_time_only: false },
];

const STATUS_STYLES: Record<CouponStatus, { bg: string; color: string }> = {
  Active: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Scheduled: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  Expired: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
  Disabled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

type FormState = {
  code: string;
  type: DiscountType;
  value: string;
  min_order: string;
  max_discount: string;
  max_uses: string;
  valid_from: string;
  valid_to: string;
  description: string;
  first_time_only: boolean;
};

const EMPTY_FORM: FormState = {
  code: '',
  type: 'percentage',
  value: '',
  min_order: '',
  max_discount: '',
  max_uses: '',
  valid_from: '',
  valid_to: '',
  description: '',
  first_time_only: false,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      min_order: String(c.min_order),
      max_discount: c.max_discount ? String(c.max_discount) : '',
      max_uses: c.max_uses ? String(c.max_uses) : '',
      valid_from: c.valid_from,
      valid_to: c.valid_to,
      description: c.description,
      first_time_only: c.first_time_only,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    if (editId) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === editId
            ? {
                ...c,
                code: form.code.toUpperCase(),
                type: form.type,
                value: parseFloat(form.value),
                min_order: parseFloat(form.min_order),
                max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
                max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
                valid_from: form.valid_from,
                valid_to: form.valid_to,
                description: form.description,
                first_time_only: form.first_time_only,
              }
            : c
        )
      );
    } else {
      const now = new Date().toISOString().split('T')[0];
      const status: CouponStatus = form.valid_from > now ? 'Scheduled' : 'Active';
      setCoupons((prev) => [
        {
          id: `cp${Date.now()}`,
          code: form.code.toUpperCase(),
          type: form.type,
          value: parseFloat(form.value),
          min_order: parseFloat(form.min_order) || 0,
          max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
          max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
          uses: 0,
          status,
          valid_from: form.valid_from,
          valid_to: form.valid_to,
          description: form.description,
          first_time_only: form.first_time_only,
        },
        ...prev,
      ]);
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this coupon? This cannot be undone.')) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === 'Active' ? 'Disabled' : 'Active' }
          : c
      )
    );
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const activeCoupons = coupons.filter((c) => c.status === 'Active').length;
  const totalUses = coupons.reduce((sum, c) => sum + c.uses, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons & Offers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Manage discount codes and promotional offers
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          <Plus size={16} />
          New Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">{coupons.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Coupons</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: '#22c55e' }}>{activeCoupons}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Active</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">{totalUses.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Total Uses</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">₹52.4K</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Discount Given</div>
        </div>
      </div>

      {/* Coupons list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Discount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>Min Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden lg:table-cell" style={{ color: 'var(--fg-muted)' }}>Validity</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Uses</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const statusStyle = STATUS_STYLES[coupon.status];
              return (
                <tr
                  key={coupon.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-subtle)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--primary)', border: '1px dashed var(--border)' }}
                      >
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => copyCode(coupon.code, coupon.id)}
                        className="p-1 rounded transition-all"
                        style={{ color: 'var(--fg-muted)' }}
                        title="Copy code"
                      >
                        {copiedId === coupon.id ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{coupon.description}</div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1 font-semibold text-sm" style={{ color: 'var(--primary)' }}>
                      {coupon.type === 'percentage' ? <Percent size={13} /> : <IndianRupee size={13} />}
                      {coupon.value}{coupon.type === 'percentage' ? '%' : ''} off
                    </div>
                    {coupon.max_discount && (
                      <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Max ₹{coupon.max_discount}</div>
                    )}
                    {coupon.first_time_only && (
                      <div className="text-xs mt-0.5" style={{ color: '#eab308' }}>First order only</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-sm">₹{coupon.min_order.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {coupon.valid_from} → {coupon.valid_to}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="font-semibold">{coupon.uses.toLocaleString()}</span>
                    {coupon.max_uses && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>/ {coupon.max_uses}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {coupon.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => toggleStatus(coupon.id)}
                        className="p-1.5 rounded-lg text-xs transition-all"
                        style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}
                        title={coupon.status === 'Active' ? 'Disable' : 'Enable'}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
                      >
                        {coupon.status === 'Active' ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => openEdit(coupon)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--fg-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--fg-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5 my-8"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--fg-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Coupon code */}
            <div>
              <label className="block text-sm font-medium mb-2">Coupon Code *</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SUMMER20"
                className="w-full px-4 py-3 rounded-xl text-sm font-mono font-bold outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)', letterSpacing: '0.08em' }}
              />
            </div>

            {/* Discount type */}
            <div>
              <label className="block text-sm font-medium mb-2">Discount Type *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['percentage', 'flat'] as DiscountType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: form.type === t ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: form.type === t ? 'var(--primary-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${form.type === t ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    {t === 'percentage' ? <Percent size={16} /> : <IndianRupee size={16} />}
                    {t === 'percentage' ? 'Percentage (%)' : 'Flat Amount (₹)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {form.type === 'percentage' ? 'Discount (%)' : 'Flat Discount (₹)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  max={form.type === 'percentage' ? 100 : undefined}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === 'percentage' ? '20' : '150'}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Min Order Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.min_order}
                  onChange={(e) => setForm((f) => ({ ...f, min_order: e.target.value }))}
                  placeholder="999"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
            </div>

            {form.type === 'percentage' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value }))}
                    placeholder="Optional cap"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Uses</label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_uses}
                    onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Valid From</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Valid To</label>
                <input
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Internal note about this coupon"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <label
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setForm((f) => ({ ...f, first_time_only: !f.first_time_only }))}
            >
              <div
                className="w-10 h-6 rounded-full transition-all relative"
                style={{ background: form.first_time_only ? 'var(--primary)' : 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                  style={{ background: 'white', left: form.first_time_only ? 'calc(100% - 22px)' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                />
              </div>
              <div>
                <div className="text-sm font-medium">First-time customers only</div>
                <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Restrict to users with no prior orders</div>
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code || !form.value}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-fg)',
                  opacity: (!form.code || !form.value) ? 0.5 : 1,
                }}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }} />
                ) : (
                  <>
                    <Tag size={15} />
                    {editId ? 'Update Coupon' : 'Create Coupon'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
