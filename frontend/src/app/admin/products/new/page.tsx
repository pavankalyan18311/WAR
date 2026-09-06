'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Plus, X, Save, Eye, Link as LinkIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadProductImageToStorage, syncProductImagesToDatabase } from '@/lib/supabase/storage';

const CATEGORIES = [
  'Oversized',
  'Classic',
  'Graphic',
  'Premium',
  'Vintage',
  'Striped',
  'Printed',
  'Solid',
  'Hoodies',
  'Sweatshirts',
  'Polos',
  'Jackets',
  'Pants',
  'Shorts',
  'Accessories',
  'Activewear',
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free Size'];

const BUILTIN_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Olive', hex: '#3F6212' },
  { name: 'Burgundy', hex: '#881337' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Cream', hex: '#FEF08A' },
  { name: 'Beige', hex: '#D97706' },
  { name: 'Sage', hex: '#84CC16' },
  { name: 'Lavender', hex: '#A855F7' },
  { name: 'Mocha', hex: '#78350F' },
  { name: 'Rust', hex: '#C2410C' },
  { name: 'Slate', hex: '#64748B' },
  { name: 'Crimson', hex: '#DC2626' },
  { name: 'Coral', hex: '#F97316' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Mustard', hex: '#EAB308' },
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
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [colorOptions, setColorOptions] = useState(BUILTIN_COLORS);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#6366f1');
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
  const [rawImageFiles, setRawImageFiles] = useState<File[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, string>>({});
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileUpload = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    setRawImageFiles((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const addImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const addCustomColor = () => {
    if (customColorName.trim()) {
      const newColor = { name: customColorName.trim(), hex: customColorHex };
      setColorOptions((prev) => [...prev, newColor]);
      toggleColor(newColor.name);
      setCustomColorName('');
    }
  };

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
    if (!form.name.trim()) {
      alert('Please enter a Product Name');
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      alert('Please enter a valid MRP price');
      return;
    }

    setSaving(true);
    try {
      const slug = `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-${Date.now().toString().slice(-4)}`;
      const priceNum = parseFloat(form.price) || 0;
      const discountNum = form.discount_price ? parseFloat(form.discount_price) : null;
      const defaultImg = 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600';

      const fabText = form.fabric ? form.fabric : '100% Heavyweight Cotton';
      const fitText = form.fit ? form.fit : 'Regular';
      const careText = form.care_instructions ? form.care_instructions : 'Machine wash cold inside out, tumble dry low';

      const fullDescription = `${form.description || `${form.name} by WAR`}\n\nFabric: ${fabText}\nFit: ${fitText}\nCare: ${careText}`;
      const finalSku = (form.sku.trim() || `WAR-${slug.slice(0, 8)}-001`).toUpperCase();

      // Generate explicit UUID for product_id / id
      const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `00000000-0000-4000-a000-${Date.now().toString().padStart(12, '0')}`;

      // 1. Upload raw File images to Supabase Storage bucket "products"
      const uploadedUrls: string[] = [];
      if (rawImageFiles.length > 0) {
        for (const file of rawImageFiles) {
          const publicUrl = await uploadProductImageToStorage(file, generatedId);
          if (publicUrl) {
            uploadedUrls.push(publicUrl);
          }
        }
      }

      // Collect URL strings provided directly in input
      for (const img of images) {
        if (!img.startsWith('data:') && img.trim()) {
          if (!uploadedUrls.includes(img.trim())) {
            uploadedUrls.push(img.trim());
          }
        }
      }

      const finalImages = uploadedUrls.length > 0 ? uploadedUrls : [defaultImg];
      const imagePayload = finalImages.map((url) => ({ url }));

      // 2. Insert into Supabase products table
      let newProds: any[] | null = null;
      let prodErr: any = null;

      // Attempt 1: Standard DB schema columns (id, sku, name, slug, description, price, discount_price)
      const attempt1 = await (supabase as any)
        .from('products')
        .insert([{
          id: generatedId,
          sku: finalSku,
          name: form.name.trim(),
          slug: slug,
          description: fullDescription,
          price: priceNum,
          discount_price: discountNum,
        }])
        .select();

      if (!attempt1.error && attempt1.data) {
        newProds = attempt1.data;
      } else {
        prodErr = attempt1.error;

        // Attempt 2: Without explicit ID (auto-gen UUID)
        const attempt2 = await (supabase as any)
          .from('products')
          .insert([{
            sku: finalSku,
            name: form.name.trim(),
            slug: slug,
            description: fullDescription,
            price: priceNum,
            discount_price: discountNum,
          }])
          .select();

        if (!attempt2.error && attempt2.data) {
          newProds = attempt2.data;
          prodErr = null;
        } else {
          prodErr = attempt2.error;
          console.error('Supabase Product Insert Failed:', attempt2.error);
          if (attempt2.error && attempt2.error.code === '42501') {
            alert(
              'Supabase Row-Level Security (RLS) Notice:\n\n' +
              'Your Supabase table "public.products" has RLS enabled which blocked this insert.\n\n' +
              'To allow product creation, run this in your Supabase SQL Editor:\n' +
              'ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;'
            );
          }
        }
      }

      const createdProd = newProds && newProds.length > 0 ? newProds[0] : null;
      const prodId = createdProd?.id || createdProd?.product_id || generatedId;

      if (createdProd && prodId) {
        // 3. Sync image records to product_images table linked to product_id
        await syncProductImagesToDatabase(prodId, finalImages, form.name.trim());

        const sizesToCreate = form.sizes.length > 0 ? form.sizes : ['M', 'L', 'XL'];
        const colorsToCreate = form.colors.length > 0 ? form.colors : ['Black'];

        const variantRows: any[] = [];
        for (const col of colorsToCreate) {
          for (const sz of sizesToCreate) {
            const skuVal = `${form.sku || slug}-${col.slice(0, 3)}-${sz}`.toUpperCase();
            const stockVal = stockBySize[sz] ? parseInt(stockBySize[sz]) : 25;
            variantRows.push({
              product_id: prodId,
              sku: skuVal,
              size: sz,
              color: col,
              stock_quantity: stockVal,
              price_override: null,
            });
          }
        }

        if (variantRows.length > 0) {
          await (supabase as any).from('product_variants').insert(variantRows);
        }
      }

      setSaved(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setSaved(true);
      setTimeout(() => { router.push('/admin/products'); }, 1000);
    } finally {
      setSaving(false);
    }
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
                  placeholder="e.g. 100% Heavyweight Cotton"
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
              <label className="block text-sm font-medium mb-2">Care Instructions</label>
              <input
                value={form.care_instructions}
                onChange={(e) => set('care_instructions', e.target.value)}
                placeholder="e.g. Machine wash cold inside out, tumble dry low, do not iron on print"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
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
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Available Colors</h2>
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map((c) => {
                const selected = form.colors.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleColor(c.name)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: selected ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: selected ? 'var(--primary-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border shrink-0"
                      style={{ background: c.hex, borderColor: c.hex === '#FFFFFF' ? '#d1d5db' : c.hex }}
                    />
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Creator */}
            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
                Add Custom Color Option
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColorHex}
                  onChange={(e) => setCustomColorHex(e.target.value)}
                  className="w-9 h-9 rounded-xl border-none cursor-pointer shrink-0"
                  style={{ background: 'transparent' }}
                  title="Pick custom color"
                />
                <input
                  type="text"
                  value={customColorName}
                  onChange={(e) => setCustomColorName(e.target.value)}
                  placeholder="e.g. Neon Pink, Forest Green..."
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomColor();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomColor}
                  disabled={!customColorName.trim()}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  + Add Color
                </button>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Product Images</h2>
            
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFileUpload(e.target.files);
              }}
            />

            {/* Drag & Drop Zone */}
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-[var(--primary)]"
              style={{ borderColor: 'var(--border)' }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload size={28} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
              <p className="text-sm font-semibold">Drag & drop images here or click to browse</p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>PNG, JPG, WEBP up to 10MB. First image is the main cover.</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                Browse Files
              </button>
            </div>

            {/* Image URL input fallback */}
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                Or add image URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-3.5 py-2 rounded-xl text-xs outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addImageUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addImageUrl}
                  disabled={!imageUrlInput.trim()}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  Add Image
                </button>
              </div>
            </div>

            {/* Image Previews Grid */}
            {images.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-muted)' }}>
                  {images.length} {images.length === 1 ? 'image' : 'images'} selected (First image is cover):
                </p>
                <div className="flex flex-wrap gap-3">
                  {images.map((img, i) => (
                    <div key={`${i}-${img.slice(0, 10)}`} className="relative group">
                      <img
                        src={img}
                        alt={`Preview ${i + 1}`}
                        className="w-20 h-20 object-cover rounded-xl border"
                        style={{ borderColor: i === 0 ? 'var(--primary)' : 'var(--border)' }}
                      />
                      {i === 0 && (
                        <span
                          className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                        >
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110"
                        style={{ background: '#ef4444', color: '#fff' }}
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
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
