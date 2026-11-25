'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Copy, X, Check, RefreshCw, Shuffle } from 'lucide-react';
import { couponSummary, parseCouponInput, CouponInputError, type CouponInput, type CouponType, type DiscountType } from '@/lib/admin/coupons';

interface Coupon extends CouponInput {
  id: string;
  uses_count: number;
  created_at: string;
}

type FormState = Record<
  'code' | 'description' | 'discount_value' | 'min_order_amount' | 'max_discount_amount' | 'max_uses' |
  'max_uses_per_user' | 'inactive_days_threshold' | 'valid_from' | 'valid_to', string
> & { coupon_type: CouponType; discount_type: DiscountType; is_active: boolean };

const EMPTY_FORM: FormState = {
  code: '', description: '', coupon_type: 'general', discount_type: 'percentage', discount_value: '',
  min_order_amount: '', max_discount_amount: '', max_uses: '', max_uses_per_user: '1',
  inactive_days_threshold: '', is_active: true, valid_from: '', valid_to: '',
};

const WHO: { value: CouponType; label: string; desc: string }[] = [
  { value: 'general', label: 'Everyone', desc: 'Any customer can use it' },
  { value: 'welcome', label: 'New customers', desc: 'Only on their first order' },
  { value: 'one_time', label: 'Once per customer', desc: 'Each customer can use it one time' },
  { value: 'welcome_back', label: 'Returning customers', desc: "Customers who haven't ordered for a while" },
];

const DISCOUNTS: { value: DiscountType; label: string; desc: string }[] = [
  { value: 'percentage', label: '% off', desc: 'e.g. 10% off the order' },
  { value: 'flat', label: '₹ off', desc: 'e.g. ₹150 off the order' },
  { value: 'free_shipping', label: 'Free shipping', desc: 'Removes the delivery fee' },
];

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };
const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm outline-none';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const endOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); };
const randomCode = () => `WAR${Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`;

function Choice<T extends string>({ options, value, onChange }: { options: { value: T; label: string; desc: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className="text-left px-3 py-2.5 rounded-xl text-xs"
          style={{ background: value === o.value ? 'var(--primary)' : 'var(--bg-subtle)', color: value === o.value ? 'var(--primary-fg)' : 'var(--fg-muted)', border: '1px solid var(--border)' }}>
          <div className="font-semibold text-sm">{o.label}</div>
          <div className="opacity-75 mt-0.5">{o.desc}</div>
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{hint}</span>}
    </label>
  );
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load coupons.');
      setCoupons(data.coupons ?? []);
    } catch (err: any) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Live check of the form, using the same rules as the server.
  const check = useMemo(() => {
    try {
      return { coupon: parseCouponInput(form), error: '' };
    } catch (err) {
      return { coupon: null, error: err instanceof CouponInputError ? err.message : 'Please check the form.' };
    }
  }, [form]);

  const openNew = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, code: randomCode() });
    setSaveError('');
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    const s = (v: number | null) => (v === null || v === undefined ? '' : String(v));
    setEditId(c.id);
    setForm({
      code: c.code, description: c.description ?? '', coupon_type: c.coupon_type, discount_type: c.discount_type,
      discount_value: c.discount_type === 'free_shipping' ? '' : String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : '', max_discount_amount: s(c.max_discount_amount),
      max_uses: s(c.max_uses), max_uses_per_user: s(c.max_uses_per_user), inactive_days_threshold: s(c.inactive_days_threshold),
      is_active: c.is_active, valid_from: c.valid_from ?? '', valid_to: c.valid_to ?? '',
    });
    setSaveError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!check.coupon) { setSaveError(check.error); return; }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(editId ? `/api/admin/coupons/${editId}` : '/api/admin/coupons', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the coupon.');
      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (url: string, method: string, body?: unknown) => {
    setListError('');
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) setListError((await res.json().catch(() => ({}))).error || 'Something went wrong.');
    fetchCoupons();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isExpired = (c: Coupon) => !!c.valid_to && c.valid_to < today();
  const notStarted = (c: Coupon) => !!c.valid_from && c.valid_from > today();
  const maxedOut = (c: Coupon) => c.max_uses !== null && c.uses_count >= c.max_uses;
  const status = (c: Coupon) =>
    isExpired(c) ? ['Expired', '#9ca3af'] : maxedOut(c) ? ['Used up', '#9ca3af'] : !c.is_active ? ['Off', '#ef4444']
      : notStarted(c) ? ['Scheduled', '#3b82f6'] : ['Live', '#22c55e'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons & Offers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Create discount codes customers enter in their cart.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCoupons} className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }} title="Refresh"><RefreshCw size={15} /></button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Plus size={16} /> New Coupon
          </button>
        </div>
      </div>

      {listError && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{listError}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Total', coupons.length], ['Live', coupons.filter((c) => status(c)[0] === 'Live').length],
          ['Times used', coupons.reduce((s, c) => s + c.uses_count, 0)], ['Expired / used up', coupons.filter((c) => isExpired(c) || maxedOut(c)).length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl p-4 text-center" style={card}>
            <div className="text-2xl font-bold">{loading ? '—' : value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-x-auto" style={card}>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--fg-muted)' }}>Loading…</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--fg-muted)' }}>No coupons yet. Click <strong>New Coupon</strong> to create one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                {['Code', 'What it does', 'Used', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const [label, color] = status(c);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg" style={{ background: 'var(--bg-subtle)', color: 'var(--primary)', border: '1px dashed var(--border)' }}>{c.code}</span>
                        <button onClick={() => copyCode(c.code, c.id)} className="p-1 rounded" style={{ color: 'var(--fg-muted)' }} aria-label={`Copy ${c.code}`}>
                          {copiedId === c.id ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
                        </button>
                      </div>
                      {c.description && <div className="text-xs mt-1 truncate max-w-[200px]" style={{ color: 'var(--fg-muted)' }}>{c.description}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-xs">{couponSummary(c)}</td>
                    <td className="px-4 py-3.5 text-sm">{c.uses_count}{c.max_uses !== null && <span style={{ color: 'var(--fg-muted)' }}> / {c.max_uses}</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${color}1f`, color }}>{label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => act(`/api/admin/coupons/${c.id}`, 'PATCH', { is_active: !c.is_active })}
                          className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
                          {c.is_active ? 'Turn off' : 'Turn on'}
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} aria-label={`Edit ${c.code}`}><Edit2 size={14} /></button>
                        <button onClick={() => confirm(`Delete coupon ${c.code}? Its usage history is deleted too.`) && act(`/api/admin/coupons/${c.id}`, 'DELETE')}
                          className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} aria-label={`Delete ${c.code}`}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div role="dialog" aria-label={editId ? 'Edit coupon' : 'New coupon'} className="w-full max-w-xl rounded-2xl p-6 space-y-6 my-8" style={card}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--fg-muted)' }} aria-label="Close"><X size={20} /></button>
            </div>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>1 · Coupon code</h3>
              <div className="flex gap-2">
                <input aria-label="Coupon code" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={20} className={`${inputCls} font-mono font-bold tracking-widest`} style={field} />
                <button type="button" onClick={() => set('code', randomCode())} className="px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1" style={field}>
                  <Shuffle size={13} /> Generate
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Letters and numbers only, e.g. DIWALI20. Customers type this in the cart.</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>2 · Who can use it</h3>
              <Choice options={WHO} value={form.coupon_type} onChange={(v) => set('coupon_type', v)} />
              {form.coupon_type === 'welcome_back' && (
                <Field label="Away for at least (days)" hint="Customer must have ordered before, but not in this many days.">
                  <input type="number" min={1} value={form.inactive_days_threshold} onChange={(e) => set('inactive_days_threshold', e.target.value)} placeholder="60" className={inputCls} style={field} />
                </Field>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>3 · Discount</h3>
              <div className="grid grid-cols-3 gap-2">
                {DISCOUNTS.map((d) => (
                  <button key={d.value} type="button" onClick={() => set('discount_type', d.value)} className="text-left px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: form.discount_type === d.value ? 'var(--primary)' : 'var(--bg-subtle)', color: form.discount_type === d.value ? 'var(--primary-fg)' : 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                    <div className="font-semibold text-sm">{d.label}</div>
                    <div className="opacity-75 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
              {form.discount_type !== 'free_shipping' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={form.discount_type === 'percentage' ? 'Discount (%)' : 'Discount (₹)'}>
                    <input type="number" min={1} max={form.discount_type === 'percentage' ? 100 : undefined} value={form.discount_value}
                      onChange={(e) => set('discount_value', e.target.value)} placeholder={form.discount_type === 'percentage' ? '10' : '150'} className={inputCls} style={field} />
                  </Field>
                  {form.discount_type === 'percentage' && (
                    <Field label="Maximum discount (₹) — optional" hint="Caps big orders, e.g. ₹300.">
                      <input type="number" min={1} value={form.max_discount_amount} onChange={(e) => set('max_discount_amount', e.target.value)} placeholder="No cap" className={inputCls} style={field} />
                    </Field>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>4 · Conditions — optional</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Minimum order (₹)" hint="Leave empty for any order value.">
                  <input type="number" min={0} value={form.min_order_amount} onChange={(e) => set('min_order_amount', e.target.value)} placeholder="Any amount" className={inputCls} style={field} />
                </Field>
                <Field label="Total uses allowed" hint="Across all customers. Empty = unlimited.">
                  <input type="number" min={1} value={form.max_uses} onChange={(e) => set('max_uses', e.target.value)} placeholder="Unlimited" className={inputCls} style={field} />
                </Field>
                {(form.coupon_type === 'general' || form.coupon_type === 'welcome_back') && (
                  <Field label="Uses per customer" hint="Empty = a customer can use it any number of times.">
                    <input type="number" min={1} value={form.max_uses_per_user} onChange={(e) => set('max_uses_per_user', e.target.value)} placeholder="Unlimited" className={inputCls} style={field} />
                  </Field>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>5 · When it works — optional</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  ['No expiry', '', ''], ['Next 7 days', today(), addDays(6)], ['Next 30 days', today(), addDays(29)], ['Till end of month', today(), endOfMonth()],
                ].map(([label, from, to]) => (
                  <button key={label} type="button" onClick={() => setForm((f) => ({ ...f, valid_from: from, valid_to: to }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={field}>{label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts on" hint="Empty = works right away.">
                  <input type="date" value={form.valid_from} onChange={(e) => set('valid_from', e.target.value)} className={inputCls} style={field} />
                </Field>
                <Field label="Last day" hint="Empty = never expires (turn it off any time).">
                  <input type="date" value={form.valid_to} min={form.valid_from || undefined} onChange={(e) => set('valid_to', e.target.value)} className={inputCls} style={field} />
                </Field>
              </div>
            </section>

            <Field label="Note for your team — optional">
              <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Instagram giveaway" className={inputCls} style={field} />
            </Field>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
              Turn this coupon on now
            </label>

            <div className="rounded-xl p-3 text-sm" style={{ background: check.coupon ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.12)' }}>
              {check.coupon
                ? <><strong className="font-mono">{check.coupon.code}</strong>: {couponSummary(check.coupon)}</>
                : <span style={{ color: '#b45309' }}>{check.error}</span>}
            </div>

            {saveError && <p role="alert" className="text-sm font-semibold" style={{ color: '#ef4444' }}>{saveError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={field}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !check.coupon} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                {saving ? 'Saving…' : editId ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
