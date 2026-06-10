'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Eye,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
} from 'lucide-react';

type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';

interface Order {
  id: string;
  customer: string;
  email: string;
  product: string;
  amount: number;
  items: number;
  status: OrderStatus;
  payment: string;
  date: string;
  city: string;
}

const MOCK_ORDERS: Order[] = [
  { id: '#TX-10482', customer: 'Arjun Sharma', email: 'arjun@example.com', product: 'Midnight Oversized Tee × 2', amount: 2998, items: 2, status: 'Delivered', payment: 'UPI', date: '2026-06-09', city: 'Bengaluru' },
  { id: '#TX-10481', customer: 'Ravi Kumar', email: 'ravi@example.com', product: 'Essential White Classic', amount: 799, items: 1, status: 'Shipped', payment: 'Card', date: '2026-06-09', city: 'Mumbai' },
  { id: '#TX-10480', customer: 'Deepak Nair', email: 'deepak@example.com', product: 'Acid Wash Vintage', amount: 1299, items: 1, status: 'Processing', payment: 'NetBanking', date: '2026-06-08', city: 'Pune' },
  { id: '#TX-10479', customer: 'Karthik M', email: 'karthik@example.com', product: 'Graphic City Tee × 3', amount: 2997, items: 3, status: 'Pending', payment: 'COD', date: '2026-06-08', city: 'Chennai' },
  { id: '#TX-10478', customer: 'Suresh Babu', email: 'suresh@example.com', product: 'Premium Pima Cotton', amount: 2199, items: 1, status: 'Delivered', payment: 'UPI', date: '2026-06-07', city: 'Hyderabad' },
  { id: '#TX-10477', customer: 'Amit Singh', email: 'amit@example.com', product: 'Urban Minimalist', amount: 1099, items: 1, status: 'Cancelled', payment: 'Card', date: '2026-06-07', city: 'Delhi' },
  { id: '#TX-10476', customer: 'Pradeep R', email: 'pradeep@example.com', product: 'Thermal Base Layer', amount: 1799, items: 1, status: 'Shipped', payment: 'UPI', date: '2026-06-06', city: 'Kolkata' },
  { id: '#TX-10475', customer: 'Vijay Kumar', email: 'vijay@example.com', product: 'Summer Stripes × 2', amount: 1798, items: 2, status: 'Returned', payment: 'Card', date: '2026-06-05', city: 'Ahmedabad' },
];

const STATUS_CONFIG: Record<OrderStatus, { bg: string; color: string; icon: React.ReactNode }> = {
  Delivered: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', icon: <CheckCircle2 size={12} /> },
  Shipped: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', icon: <Truck size={12} /> },
  Processing: { bg: 'rgba(234,179,8,0.12)', color: '#eab308', icon: <Clock size={12} /> },
  Pending: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af', icon: <AlertCircle size={12} /> },
  Cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: <XCircle size={12} /> },
  Returned: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', icon: <XCircle size={12} /> },
};

const ALL_STATUSES: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdatingId(id);
    await new Promise((r) => setTimeout(r, 500));
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    if (selectedOrder?.id === id) setSelectedOrder((prev) => prev ? { ...prev, status } : null);
    setUpdatingId(null);
  };

  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned')
    .reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Manage and track all customer orders
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(
          [
            { label: 'Total Orders', value: orders.length, color: 'var(--fg)' },
            { label: 'Processing', value: orders.filter((o) => o.status === 'Processing' || o.status === 'Pending').length, color: '#eab308' },
            { label: 'In Transit', value: orders.filter((o) => o.status === 'Shipped').length, color: '#3b82f6' },
            { label: 'Revenue', value: `₹${(totalRevenue / 1000).toFixed(1)}K`, color: '#22c55e' },
          ] as const
        ).map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {['All', ...ALL_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filterStatus === s ? 'var(--primary)' : 'var(--bg-subtle)',
                color: filterStatus === s ? 'var(--primary-fg)' : 'var(--fg-muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Payment</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => {
              const sc = STATUS_CONFIG[order.status];
              return (
                <tr
                  key={order.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-subtle)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-sm">{order.id}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{order.date}</div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="text-sm font-medium">{order.customer}</div>
                    <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{order.city}</div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="text-xs truncate max-w-[160px]" style={{ color: 'var(--fg-muted)' }}>{order.product}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold">₹{order.amount.toLocaleString()}</div>
                    <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{order.items} item{order.items > 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                    >
                      {order.payment}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.color }}
                    >
                      {sc.icon}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'var(--fg-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div
          className="flex items-center justify-between px-5 py-3 text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}
        >
          <span>Showing {filtered.length} of {orders.length} orders</span>
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedOrder.id}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{selectedOrder.date}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ color: 'var(--fg-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            {/* Customer info */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-subtle)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Customer</div>
              <div className="text-sm font-semibold">{selectedOrder.customer}</div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{selectedOrder.email}</div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{selectedOrder.city}</div>
            </div>

            {/* Order items */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Items</div>
              <div className="text-sm">{selectedOrder.product}</div>
              <div className="flex justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-bold">₹{selectedOrder.amount.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--fg-muted)' }}>Payment Method</span>
              <span className="font-medium">{selectedOrder.payment}</span>
            </div>

            {/* Update status */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>Update Status</div>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => {
                  const sc = STATUS_CONFIG[s];
                  const isCurrent = selectedOrder.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedOrder.id, s)}
                      disabled={isCurrent || updatingId === selectedOrder.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: isCurrent ? sc.bg : 'var(--bg-subtle)',
                        color: isCurrent ? sc.color : 'var(--fg-muted)',
                        border: `1px solid ${isCurrent ? sc.color + '40' : 'var(--border)'}`,
                        opacity: updatingId === selectedOrder.id && !isCurrent ? 0.5 : 1,
                      }}
                    >
                      {sc.icon}
                      {s}
                      {isCurrent && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
