'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Eye, ChevronDown, Package, AlertTriangle } from 'lucide-react';
import type { AdminProductRow } from '@/lib/admin/products';

const LOW_STOCK = 20;
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  draft: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  archived: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
};
const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const subtle = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load products.');
      setProducts(data.products);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (p: AdminProductRow, status: string) => {
    setError('');
    const res = await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not update status.');
      return;
    }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, status } : x)));
  };

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
      return matchSearch && (filterStatus === 'all' || p.status === filterStatus);
    })
    .sort((a, b) => {
      if (sortBy === 'price') return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === 'stock') return b.stock - a.stock;
      if (sortBy === 'sales') return b.sales - a.sales;
      return a.name.localeCompare(b.name);
    });

  const live = products.filter((p) => p.status === 'active');
  const stats = [
    { label: 'Active Products', value: live.length, style: card, color: 'var(--fg)' },
    { label: `Low Stock (≤${LOW_STOCK})`, value: live.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length, style: { background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }, color: '#eab308' },
    { label: 'Out of Stock', value: live.filter((p) => p.stock === 0).length, style: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Manage your product catalog</p>
        </div>
        <Link href="/admin/products/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={s.style}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{loading ? '—' : s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 flex flex-wrap items-center gap-3" style={card}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={subtle} />
        </div>
        <div className="flex items-center gap-1">
          {['all', 'active', 'draft', 'archived'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className="px-3 py-2 rounded-lg text-xs font-medium capitalize"
              style={{ background: filterStatus === s ? 'var(--primary)' : 'var(--bg-subtle)', color: filterStatus === s ? 'var(--primary-fg)' : 'var(--fg-muted)' }}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-xs font-medium outline-none appearance-none pr-8 cursor-pointer" style={subtle}>
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price (High to Low)</option>
            <option value="stock">Sort by Stock</option>
            <option value="sales">Sort by Units Sold</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
        </div>
      </div>

      <div className="rounded-2xl overflow-x-auto" style={card}>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
              {['Product', 'Category', 'Price', 'Stock', 'Units Sold', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'var(--fg-muted)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'var(--fg-muted)' }}>
                  <Package size={32} className="mx-auto mb-2 opacity-50" /> No products found
                </td>
              </tr>
            ) : filtered.map((p) => {
              const st = STATUS_STYLES[p.status] ?? STATUS_STYLES.draft;
              const lowStock = p.stock > 0 && p.stock <= LOW_STOCK;
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" style={{ border: '1px solid var(--border)' }} />
                        : <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-black" style={{ background: 'var(--bg-elevated)', color: 'var(--fg-subtle)' }}>WAR</div>}
                      <span className="font-medium truncate max-w-[180px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" style={{ color: 'var(--fg-muted)' }}>{p.category ?? '—'}</td>
                  <td className="px-4 py-3.5 font-semibold">{p.price === null ? <span style={{ color: '#ef4444' }}>No price set</span> : `₹${p.price.toLocaleString('en-IN')}`}</td>
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/products/${p.id}/edit`} className="inline-flex items-center gap-1.5 hover:underline"
                      style={{ color: p.stock === 0 ? '#ef4444' : lowStock ? '#eab308' : 'var(--fg)' }} title="Edit stock per size">
                      {(p.stock === 0 || lowStock) && <AlertTriangle size={12} />}
                      {p.variants === 0 ? 'No sizes' : p.stock === 0 ? 'Out of stock' : `${p.stock} units`}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{p.sales}</td>
                  <td className="px-4 py-3.5">
                    <select aria-label={`Status of ${p.name}`} value={p.status} onChange={(e) => setStatus(p, e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium capitalize cursor-pointer outline-none"
                      style={{ background: st.bg, color: st.color, border: 'none' }}>
                      <option value="active">active</option>
                      <option value="draft">draft</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'active' && (
                        <Link href={`/products/${p.slug}`} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} title="View on store"><Eye size={15} /></Link>
                      )}
                      <Link href={`/admin/products/${p.id}/edit`} className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} title="Edit product"><Edit2 size={15} /></Link>
                      {p.status !== 'archived' && (
                        <button onClick={() => confirm('Archive this product? It will no longer appear on the store.') && setStatus(p, 'archived')}
                          className="p-1.5 rounded-lg" style={{ color: 'var(--fg-muted)' }} title="Archive product"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-5 py-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
          Showing {filtered.length} of {products.length} products
        </div>
      </div>
    </div>
  );
}
