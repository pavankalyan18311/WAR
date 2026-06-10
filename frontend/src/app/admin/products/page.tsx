'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  ChevronDown,
  Package,
  AlertTriangle,
} from 'lucide-react';

interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  discount_price?: number;
  stock: number;
  status: 'Active' | 'Draft' | 'Archived';
  sales: number;
  image: string;
}

const MOCK_PRODUCTS: AdminProduct[] = [
  { id: 'p1', name: 'Midnight Oversized Tee', category: 'Oversized', price: 1499, discount_price: 1199, stock: 45, status: 'Active', sales: 342, image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=60&h=60&fit=crop' },
  { id: 'p2', name: 'Essential White Classic', category: 'Classic', price: 799, stock: 120, status: 'Active', sales: 289, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=60&h=60&fit=crop' },
  { id: 'p3', name: 'Graphic City Tee', category: 'Graphic', price: 999, discount_price: 799, stock: 32, status: 'Active', sales: 215, image: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=60&h=60&fit=crop' },
  { id: 'p4', name: 'Premium Pima Cotton', category: 'Premium', price: 2199, stock: 18, status: 'Active', sales: 178, image: 'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=60&h=60&fit=crop' },
  { id: 'p5', name: 'Acid Wash Vintage', category: 'Vintage', price: 1299, stock: 0, status: 'Active', sales: 156, image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=60&h=60&fit=crop' },
  { id: 'p6', name: 'Summer Stripes', category: 'Classic', price: 899, stock: 76, status: 'Draft', sales: 0, image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=60&h=60&fit=crop' },
  { id: 'p7', name: 'Thermal Base Layer', category: 'Premium', price: 1799, stock: 54, status: 'Active', sales: 92, image: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=60&h=60&fit=crop' },
  { id: 'p8', name: 'Urban Minimalist', category: 'Oversized', price: 1399, discount_price: 1099, stock: 28, status: 'Active', sales: 134, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=60&h=60&fit=crop' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Draft: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  Archived: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
};

export default function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>(MOCK_PRODUCTS);

  const filtered = products
    .filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'stock') return b.stock - a.stock;
      if (sortBy === 'sales') return b.sales - a.sales;
      return a.name.localeCompare(b.name);
    });

  const handleDelete = (id: string) => {
    if (confirm('Archive this product? It will no longer appear on the storefront.')) {
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'Archived' as const } : p));
    }
    setOpenMenu(null);
  };

  const activeCount = products.filter((p) => p.status === 'Active').length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 20).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Manage your product catalog
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-2xl font-bold">{activeCount}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Active Products</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <div className="text-2xl font-bold" style={{ color: '#eab308' }}>{lowStockCount}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Low Stock (&le;20)</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{outOfStockCount}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Out of Stock</div>
        </div>
      </div>

      {/* Filters bar */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
            }}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {['All', 'Active', 'Draft', 'Archived'].map((s) => (
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

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-medium outline-none cursor-pointer"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
            }}
          >
            <option value="name">Sort: Name</option>
            <option value="price">Sort: Price</option>
            <option value="stock">Sort: Stock</option>
            <option value="sales">Sort: Sales</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
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
              <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>Stock</th>
              <th className="text-left px-4 py-3 text-xs font-semibold hidden lg:table-cell" style={{ color: 'var(--fg-muted)' }}>Sales</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                  <Package size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No products found</p>
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const statusStyle = STATUS_STYLES[p.status];
                const isLowStock = p.stock > 0 && p.stock <= 20;
                return (
                  <tr
                    key={p.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                          style={{ border: '1px solid var(--border)' }}
                        />
                        <span className="font-medium truncate max-w-[160px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        {p.discount_price ? (
                          <>
                            <span className="font-semibold">₹{p.discount_price.toLocaleString()}</span>
                            <span className="text-xs ml-1.5 line-through" style={{ color: 'var(--fg-muted)' }}>
                              ₹{p.price.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="font-semibold">₹{p.price.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span
                        className="flex items-center gap-1 text-sm"
                        style={{ color: p.stock === 0 ? '#ef4444' : isLowStock ? '#eab308' : 'var(--fg)' }}
                      >
                        {(p.stock === 0 || isLowStock) && <AlertTriangle size={12} />}
                        {p.stock === 0 ? 'Out of stock' : p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="font-medium">{p.sales}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="relative flex items-center gap-1 justify-end">
                        <Link
                          href={`/products/${p.id}`}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: 'var(--fg-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                          title="View on store"
                        >
                          <Eye size={15} />
                        </Link>
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: 'var(--fg-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--fg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                          title="Edit product"
                        >
                          <Edit2 size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: 'var(--fg-muted)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; }}
                          title="Archive product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table footer */}
        <div
          className="flex items-center justify-between px-5 py-3 text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--fg-muted)' }}
        >
          <span>Showing {filtered.length} of {products.length} products</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>← Prev</button>
            <button className="px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>1</button>
            <button className="px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
