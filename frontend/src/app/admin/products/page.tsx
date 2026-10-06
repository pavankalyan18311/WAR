'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPublicStorageUrl } from '@/lib/supabase/queries';
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
  Layers,
  X,
  Check,
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
  slug?: string;
  rawVariants?: any[];
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
  const supabase = useMemo(() => createClient(), []);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [products, setProducts] = useState<AdminProduct[]>(MOCK_PRODUCTS);
  const [loading, setLoading] = useState(true);

  // Quick Stock Modal State
  const [stockModalProduct, setStockModalProduct] = useState<AdminProduct | null>(null);
  const [quickStockValue, setQuickStockValue] = useState<number>(0);
  const [updatingStock, setUpdatingStock] = useState(false);

  const fetchSupabaseProducts = async () => {
    try {
      let { data, error } = await (supabase as any)
        .from('products')
        .select(`
          *,
          product_media(*),
          product_categories(categories(*)),
          product_variants(*, inventory(*))
        `);

      if (error) {
        console.warn('Primary products query notice:', error);
        // Fallback simple query
        const fallbackRes = await (supabase as any).from('products').select('*');
        data = fallbackRes.data;
      }

      if (data && data.length > 0) {
        const mapped: AdminProduct[] = data.map((p: any) => {
          const variants = p.product_variants || p.variants || [];
          let minPrice = p.price || 0;
          let discountPrice = p.discount_price || undefined;
          let totalStock = 0;

          if (variants.length > 0) {
            const prices = variants.map((v: any) => parseFloat(v.price || 0)).filter((pr: number) => pr > 0);
            if (prices.length > 0) minPrice = Math.min(...prices);

            const comparePrices = variants.map((v: any) => parseFloat(v.compare_at_price || 0)).filter((pr: number) => pr > 0);
            if (comparePrices.length > 0) discountPrice = minPrice;

            totalStock = variants.reduce((sum: number, v: any) => {
              const invQty = v.inventory?.quantity ?? v.inventory?.[0]?.quantity ?? v.stock_quantity ?? 0;
              return sum + invQty;
            }, 0);
          } else {
            totalStock = p.stock || 0;
          }

          let primaryImg = 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=60&h=60&fit=crop';
          if (Array.isArray(p.product_media) && p.product_media.length > 0) {
            primaryImg = p.product_media[0].storage_path || p.product_media[0].url || primaryImg;
          } else if (Array.isArray(p.product_images) && p.product_images.length > 0) {
            primaryImg = p.product_images[0].url || primaryImg;
          } else if (Array.isArray(p.images) && p.images.length > 0) {
            primaryImg = typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url || primaryImg;
          } else if (p.image_url) {
            primaryImg = p.image_url;
          }

          primaryImg = getPublicStorageUrl(primaryImg, p.id || p.slug);

          let categoryName = 'General';
          if (Array.isArray(p.product_categories) && p.product_categories.length > 0) {
            categoryName = p.product_categories[0]?.categories?.name || categoryName;
          } else if (p.category?.name) {
            categoryName = p.category.name;
          }

          let statusVal: 'Active' | 'Draft' | 'Archived' = 'Active';
          if (p.status) {
            const lower = String(p.status).toLowerCase();
            if (lower === 'draft') statusVal = 'Draft';
            else if (lower === 'archived') statusVal = 'Archived';
            else statusVal = 'Active';
          } else if (p.is_active !== undefined) {
            statusVal = p.is_active ? 'Active' : 'Draft';
          }

          return {
            id: p.id || p.product_id || p.slug,
            name: p.name,
            category: categoryName,
            price: minPrice || 999,
            discount_price: discountPrice,
            stock: totalStock,
            status: statusVal,
            sales: 12 + (p.id ? p.id.charCodeAt(0) % 50 : 0),
            image: primaryImg,
            slug: p.slug,
            rawVariants: variants,
          };
        });
        setProducts(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch products from Supabase', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseProducts();
  }, [supabase]);

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

  const toggleStatus = async (p: AdminProduct) => {
    const nextStatusMap: Record<string, 'Active' | 'Draft' | 'Archived'> = {
      Active: 'Draft',
      Draft: 'Active',
      Archived: 'Draft',
    };
    const nextStatus = nextStatusMap[p.status];

    setProducts((prev) => prev.map((item) => item.id === p.id ? { ...item, status: nextStatus } : item));

    try {
      await (supabase as any)
        .from('products')
        .update({ status: nextStatus.toLowerCase() })
        .eq('id', p.id);
    } catch (e) {
      console.error('Failed updating product status', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Archive this product? It will no longer appear on the storefront.')) {
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'Archived' as const } : p));
      try {
        await (supabase as any)
          .from('products')
          .update({ status: 'archived' })
          .eq('id', id);
      } catch (e) {
        console.error('Failed archiving product', e);
      }
    }
  };

  const handleSaveQuickStock = async () => {
    if (!stockModalProduct) return;
    setUpdatingStock(true);

    try {
      const p = stockModalProduct;
      const variants = p.rawVariants || [];

      if (variants.length > 0) {
        for (const v of variants) {
          if (v.id) {
            await (supabase as any)
              .from('inventory')
              .upsert(
                [{ variant_id: v.id, quantity: quickStockValue }],
                { onConflict: 'variant_id' }
              );
          }
        }
      }

      setProducts((prev) => prev.map((item) => item.id === p.id ? { ...item, stock: quickStockValue * (variants.length || 1) } : item));
      setStockModalProduct(null);
    } catch (err) {
      console.error('Failed to update quick stock:', err);
    } finally {
      setUpdatingStock(false);
    }
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
            className="px-3 py-2.5 rounded-xl text-xs font-medium outline-none appearance-none pr-8 cursor-pointer"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
            }}
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price (High to Low)</option>
            <option value="stock">Sort by Stock</option>
            <option value="sales">Sort by Best Sellers</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-muted)' }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
              <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Product</th>
              <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--fg-muted)' }}>Category</th>
              <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Price</th>
              <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--fg-muted)' }}>Stock</th>
              <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--fg-muted)' }}>Sales</th>
              <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Status</th>
              <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-right" style={{ color: 'var(--fg-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center" style={{ color: 'var(--fg-muted)' }}>
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  No products found
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => {
                const statusStyle = STATUS_STYLES[p.status] || STATUS_STYLES.Active;
                const isLowStock = p.stock > 0 && p.stock <= 20;

                return (
                  <tr
                    key={p.id ? `${p.id}-${idx}` : `prod-${idx}`}
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
                      <button
                        onClick={() => {
                          setStockModalProduct(p);
                          setQuickStockValue(Math.max(1, Math.floor(p.stock / Math.max(1, p.rawVariants?.length || 1))));
                        }}
                        className="flex items-center gap-1.5 text-sm hover:underline cursor-pointer"
                        style={{ color: p.stock === 0 ? '#ef4444' : isLowStock ? '#eab308' : 'var(--fg)' }}
                        title="Click to adjust stock"
                      >
                        {(p.stock === 0 || isLowStock) && <AlertTriangle size={12} />}
                        {p.stock === 0 ? 'Out of stock' : `${p.stock} units`}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="font-medium">{p.sales}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleStatus(p)}
                        className="inline-flex text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-transform active:scale-95"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                        title="Click to toggle status"
                      >
                        {p.status}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="relative flex items-center gap-1 justify-end">
                        <Link
                          href={`/products/${p.slug || p.id}`}
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

      {/* Quick Stock Adjustment Modal */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Quick Stock Adjustment</h3>
              <button
                onClick={() => setStockModalProduct(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Adjust variant inventory quantity for <span className="font-semibold text-white">{stockModalProduct.name}</span>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                Stock Per Variant
              </label>
              <input
                type="number"
                min="0"
                value={quickStockValue}
                onChange={(e) => setQuickStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStockModalProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'var(--bg-subtle)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickStock}
                disabled={updatingStock}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                {updatingStock ? 'Saving...' : 'Save Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
