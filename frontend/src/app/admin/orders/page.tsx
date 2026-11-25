'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Eye, Truck, CheckCircle2, Clock, AlertCircle, XCircle, Download, Package } from 'lucide-react';
import { ordersToCsv, type AdminOrderRow } from '@/lib/admin/orders';
import { isCountedSale } from '@/lib/analytics';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Payment not completed', color: '#9ca3af', icon: <AlertCircle size={12} /> },
  confirmed: { label: 'Confirmed', color: '#6366f1', icon: <CheckCircle2 size={12} /> },
  processing: { label: 'Packing', color: '#eab308', icon: <Clock size={12} /> },
  shipped: { label: 'Shipped', color: '#3b82f6', icon: <Truck size={12} /> },
  delivered: { label: 'Delivered', color: '#22c55e', icon: <CheckCircle2 size={12} /> },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: <XCircle size={12} /> },
  refunded: { label: 'Refunded', color: '#f97316', icon: <XCircle size={12} /> },
};
const FULFILMENT_STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];
const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const subtle = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };

function StatusBadge({ status }: { status: string }) {
  const sc = STATUS_CONFIG[status] ?? { label: status, color: '#9ca3af', icon: null };
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${sc.color}1f`, color: sc.color }}>
      {sc.icon}{sc.label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load orders.');
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  useEffect(() => { setTracking(selected?.tracking ?? ''); }, [selected?.id, selected?.tracking]);

  const act = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update the order.');
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([ordersToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `war-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const q = search.toLowerCase();
  // Abandoned online payments live in their own tab so they never mix with real orders.
  const realOrders = orders.filter((o) => !o.abandoned);
  const abandoned = orders.filter((o) => o.abandoned);
  const filtered = (filterStatus === 'abandoned' ? abandoned : realOrders).filter((o) =>
    (filterStatus === 'all' || filterStatus === 'abandoned' || o.status === filterStatus) &&
    [o.reference, o.customer, o.email, o.phone].some((v) => v.toLowerCase().includes(q)),
  );
  const revenue = orders
    .filter((o) => isCountedSale({ total: o.total, status: o.status, payment_status: o.paymentStatus, created_at: o.date }))
    .reduce((s, o) => s + o.total, 0);
  const stats = [
    { label: 'Total Orders', value: realOrders.length, color: 'var(--fg)' },
    { label: 'To Ship', value: orders.filter((o) => o.status === 'confirmed' || o.status === 'processing').length, color: '#eab308' },
    { label: 'In Transit', value: orders.filter((o) => o.status === 'shipped').length, color: '#3b82f6' },
    { label: 'Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, color: '#22c55e' },
  ];
  const cancellable = selected && ['pending', 'confirmed', 'processing'].includes(selected.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Manage and track all customer orders</p>
        </div>
        <button onClick={exportCsv} disabled={filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={subtle}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={card}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{loading ? '—' : s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 flex flex-wrap items-center gap-3" style={card}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference, customer, email, phone…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={subtle} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {['all', ...Object.keys(STATUS_CONFIG).filter((s) => s !== 'pending'), 'abandoned'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: filterStatus === s ? 'var(--primary)' : 'var(--bg-subtle)', color: filterStatus === s ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>
              {s === 'all' ? 'All' : s === 'abandoned' ? `Abandoned payments (${abandoned.length})` : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {filterStatus === 'abandoned' && (
        <p className="text-xs px-1" style={{ color: 'var(--fg-muted)' }}>
          The customer opened online payment but closed the payment window without paying. No money was taken and no stock was used — these are not real orders. Useful if you want to follow up with the customer.
        </p>
      )}

      <div className="rounded-2xl overflow-x-auto" style={card}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              {['Order', 'Customer', 'Items', 'Amount', 'Payment', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'var(--fg-muted)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'var(--fg-muted)' }}><Package size={28} className="mx-auto mb-2 opacity-50" />No orders found</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3.5"><div className="font-semibold font-mono">{o.reference}</div><div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{o.date}</div></td>
                <td className="px-4 py-3.5"><div className="font-medium">{o.customer || '—'}</div><div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{o.email}</div></td>
                <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--fg-muted)' }}>{o.units} unit{o.units === 1 ? '' : 's'}</td>
                <td className="px-4 py-3.5 font-semibold">₹{o.total.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3.5 text-xs">{o.payment}</td>
                <td className="px-4 py-3.5"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3.5"><button onClick={() => setSelectedId(o.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} aria-label={`View ${o.reference}`}><Eye size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>Showing {filtered.length} of {filterStatus === 'abandoned' ? abandoned.length : realOrders.length} {filterStatus === 'abandoned' ? 'abandoned payments' : 'orders'}</div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-5" style={card}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-mono">{selected.reference}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{selected.date} · <StatusBadge status={selected.status} /></p>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ color: 'var(--fg-muted)' }} aria-label="Close"><XCircle size={20} /></button>
            </div>

            <div className="rounded-xl p-4 space-y-1 text-sm" style={{ background: 'var(--bg-subtle)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Ship to</div>
              <div className="font-semibold">{selected.customer}</div>
              <div style={{ color: 'var(--fg-muted)' }}>{selected.address}</div>
              <div style={{ color: 'var(--fg-muted)' }}>{selected.phone} · {selected.email}</div>
            </div>

            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-subtle)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Items</div>
              {selected.items.map((it) => (
                <div key={it.id} className="flex justify-between py-1" style={{ opacity: it.cancelled ? 0.5 : 1 }}>
                  <span>{it.name}{it.variant && ` (${it.variant})`} × {it.quantity}{it.cancelled && ' — cancelled'}</span>
                  <span>₹{it.total.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="flex justify-between mt-3 pt-3 font-bold" style={{ borderTop: '1px solid var(--border)' }}>
                <span>Total</span><span>₹{selected.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>Payment: {selected.payment}</div>
            </div>

            {!['cancelled', 'refunded'].includes(selected.status) && !selected.abandoned && (
              <div className="rounded-xl p-4 text-sm space-y-2" style={{ background: 'var(--bg-subtle)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Shiprocket</div>
                {selected.courier || selected.tracking ? (
                  <p>{selected.courier || 'Courier assigned'}{selected.tracking && <> · AWB <span className="font-mono">{selected.tracking}</span></>}</p>
                ) : (
                  <p style={{ color: 'var(--fg-muted)' }}>{selected.inShiprocket ? 'In Shiprocket — courier not assigned yet.' : 'Not sent to Shiprocket yet.'}</p>
                )}
                {selected.shippingError && <p role="alert" className="text-xs" style={{ color: '#ef4444' }}>{selected.shippingError}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selected.labelUrl && (
                    <a href={selected.labelUrl} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                      Print label
                    </a>
                  )}
                  {!selected.tracking && (
                    <button disabled={busy} onClick={() => act('/api/shipping/create-order', 'POST', { order_id: selected.id })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                      {selected.inShiprocket ? 'Retry courier assignment' : 'Send to Shiprocket'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Courier tracking number</label>
              <div className="flex gap-2 mt-2">
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-sm" style={subtle} />
                <button disabled={busy} onClick={() => act(`/api/admin/orders/${selected.id}`, 'PATCH', { tracking_number: tracking })}
                  className="px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Save</button>
              </div>
            </div>

            {!['cancelled', 'refunded', 'pending'].includes(selected.status) && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Update status</div>
                <div className="flex flex-wrap gap-2">
                  {FULFILMENT_STEPS.map((s) => (
                    <button key={s} disabled={busy || selected.status === s} onClick={() => act(`/api/admin/orders/${selected.id}`, 'PATCH', { status: s })}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-60"
                      style={{ background: selected.status === s ? `${STATUS_CONFIG[s].color}1f` : 'var(--bg-subtle)', color: selected.status === s ? STATUS_CONFIG[s].color : 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                      {STATUS_CONFIG[s].label}{selected.status === s && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cancellable && (
              <button disabled={busy}
                onClick={() => confirm('Cancel this order? Online payments are refunded automatically and stock is put back.') && act(`/api/admin/orders/${selected.id}/cancel`, 'POST')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                Cancel order & refund
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
