'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Plus, X, Save, Eye } from 'lucide-react';

const CATEGORIES = ['Oversized', 'Classic', 'Graphic', 'Premium', 'Vintage', 'Striped', 'Printed', 'Solid'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Olive', hex: '#6B7C41' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Sky Blue', hex: '#87CEEB' },
  { name: 'Cream', hex: '#FFFDD0' },
];

interface FormState {
  name: string;
  description: string;
  category: string;
  price: string;
  discount_price: string;
  sku: string;
  sizes: string[];
  colors: string[];
  status: 'Active' | 'Draft';
  featured: boolean;
  tags: string;
  care_instructions: string;
  fabric: string;
  fit: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    category: '',
    price: '',
    discount_price: '',
    sku: '',
    sizes: [],
    colors: [],
    status: 'Draft',
    featured: false,
    tags: '',
    care_instructions: '',
    fabric: '',
    fit: 'Regular',
  });
  const [images, setImages] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, string>>({});

  const set = (key: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSize = (size: string) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  };

  const toggleColor = (color: string) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter((c) => c !== color) : [...prev.colors, color],
    }));
  };

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    if (publish) setForm((prev) => ({ ...prev, status: 'Active' }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push('/admin/products');
    }, 1200);
  };

  const discount = form.price && form.discount_price
    ? Math.round((1 - parseFloat(form.discount_price) / parseFloat(form.price)) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl transition-all"
            style={{ color: 'var(--fg-muted)', background: 'var(--bg-subtle)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add New Product</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>Fill in the product details below</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || saved}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
          >
            <Save size={15} />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || saved || !form.name || !form.price || !form.category}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: saved ? '#22c55e' : 'var(--primary)',
              color: 'var(--primary-fg)',
              opacity: (!form.name || !form.price || !form.category) ? 0.5 : 1,
              cursor: (!form.name || !form.price || !form.category) ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary-fg)', borderTopColor: 'transparent' }} />
            ) : saved ? (
              '✓ Published!'
            ) : (
              <>
                <Eye size={15} />
                Publish
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic info */}
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Basic Information</h2>

            <div>
              <label className="block text-sm font-medium mb-2">Product Name *</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Midnight Oversized Tee"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Describe the product, its features and materials…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SKU</label>
                <input
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  placeholder="e.g. TX-OVR-001"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fabric</label>
                <input
                  value={form.fabric}
                  onChange={(e) => set('fabric', e.target.value)}
                  placeholder="e.g. 100% Cotton"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fit</label>
                <select
                  value={form.fit}
                  onChange={(e) => set('fit', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                >
                  <option>Regular</option>
                  <option>Oversized</option>
                  <option>Slim</option>
                  <option>Relaxed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
              <input
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="e.g. oversized, cotton, summer (comma-separated)"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            </div>
          </div>

          {/* Sizes & Stock */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-5" style={{ color: 'var(--fg-muted)' }}>Sizes & Stock</h2>
            <div className="flex flex-wrap gap-2 mb-5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: form.sizes.includes(s) ? 'var(--primary)' : 'var(--bg-subtle)',
                    color: form.sizes.includes(s) ? 'var(--primary-fg)' : 'var(--fg-muted)',
                    border: `1px solid ${form.sizes.includes(s) ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {form.sizes.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-3">
                {form.sizes.map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-10">{s}</span>
                    <input
                      type="number"
                      min="0"
                      value={stockBySize[s] ?? ''}
                      onChange={(e) => setStockBySize((prev) => ({ ...prev, [s]: e.target.value }))}
                      placeholder="Stock qty"
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-5" style={{ color: 'var(--fg-muted)' }}>Available Colors</h2>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => {
                const selected = form.colors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    onClick={() => toggleColor(c.name)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: selected ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: selected ? 'var(--primary-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ background: c.hex, borderColor: c.hex === '#FFFFFF' ? '#d1d5db' : c.hex }}
                    />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-5" style={{ color: 'var(--fg-muted)' }}>Product Images</h2>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{ borderColor: 'var(--border)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
            >
              <Upload size={24} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
              <p className="text-sm font-medium">Drag & drop images here</p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>PNG, JPG up to 10MB. First image is the cover.</p>
              <button
                className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              >
                Browse Files
              </button>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Pricing & settings */}
        <div className="space-y-5">
          {/* Pricing */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-5" style={{ color: 'var(--fg-muted)' }}>Pricing</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">MRP (₹) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="1299"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sale Price (₹)</label>
                <input
                  type="number"
                  value={form.discount_price}
                  onChange={(e) => set('discount_price', e.target.value)}
                  placeholder="Leave blank if no sale"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              </div>
              {discount > 0 && (
                <div
                  className="text-center py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                >
                  {discount}% discount applied
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-5" style={{ color: 'var(--fg-muted)' }}>Status & Visibility</h2>
            <div className="space-y-3">
              {(['Active', 'Draft'] as const).map((s) => (
                <label key={s} className="flex items-center gap-3 cursor-pointer">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: form.status === s ? 'var(--primary)' : 'var(--border)',
                      background: form.status === s ? 'var(--primary)' : 'transparent',
                    }}
                    onClick={() => set('status', s)}
                  >
                    {form.status === s && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary-fg)' }} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{s}</div>
                    <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                      {s === 'Active' ? 'Visible on storefront' : 'Hidden from customers'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => set('featured', !form.featured)}>
                <div
                  className="w-10 h-6 rounded-full transition-all relative"
                  style={{ background: form.featured ? 'var(--primary)' : 'var(--bg-subtle)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{
                      background: 'white',
                      left: form.featured ? 'calc(100% - 22px)' : '2px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium">Featured Product</div>
                  <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Show on homepage</div>
                </div>
              </label>
            </div>
          </div>

          {/* Summary */}
          {(form.name || form.price) && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>Preview</h2>
              <div className="text-sm font-semibold">{form.name || '—'}</div>
              {form.price && (
                <div className="text-sm mt-1" style={{ color: 'var(--primary)' }}>
                  {form.discount_price ? `₹${form.discount_price}` : `₹${form.price}`}
                  {form.discount_price && (
                    <span className="ml-2 line-through text-xs" style={{ color: 'var(--fg-muted)' }}>₹{form.price}</span>
                  )}
                </div>
              )}
              {form.category && (
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{form.category}</div>
              )}
              {form.sizes.length > 0 && (
                <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                  Sizes: {form.sizes.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
