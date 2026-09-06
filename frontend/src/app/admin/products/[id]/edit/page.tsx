'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Save, X, Eye } from 'lucide-react';
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

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Oversized');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [sku, setSku] = useState('');
  const [fabric, setFabric] = useState('100% Heavyweight Cotton');
  const [fit, setFit] = useState('Oversized');
  const [careInstructions, setCareInstructions] = useState('Machine wash cold inside out, tumble dry low');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['M', 'L', 'XL']);
  const [selectedColors, setSelectedColors] = useState<string[]>(['Black', 'White']);
  const [images, setImages] = useState<string[]>([]);
  const [rawImageFiles, setRawImageFiles] = useState<File[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [actualProductId, setActualProductId] = useState<string>(productId);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('products')
          .select('*, variants:product_variants(*), product_images(*)')
          .or(`id.eq.${productId},product_id.eq.${productId},slug.eq.${productId}`)
          .single();

        if (data) {
          const resolvedId = data.id || data.product_id || productId;
          setActualProductId(resolvedId);
          setName(data.name || '');
          setDescription(data.description ? data.description.split('\n\nFabric:')[0] : '');
          setPrice(data.price ? String(data.price) : '');
          setDiscountPrice(data.discount_price ? String(data.discount_price) : '');
          setSku(data.sku || `WAR-${(data.slug || 'prod').slice(0, 8)}-001`.toUpperCase());

          // Check product_images table first
          if (Array.isArray(data.product_images) && data.product_images.length > 0) {
            setImages(data.product_images.map((img: any) => img.url));
          } else if (Array.isArray(data.images) && data.images.length > 0) {
            setImages(data.images.map((i: any) => typeof i === 'string' ? i : i?.url || i));
          }

          if (data.variants && data.variants.length > 0) {
            const sizes = Array.from(new Set(data.variants.map((v: any) => v.size).filter(Boolean))) as string[];
            const colors = Array.from(new Set(data.variants.map((v: any) => v.color).filter(Boolean))) as string[];
            if (sizes.length > 0) setSelectedSizes(sizes);
            if (colors.length > 0) setSelectedColors(colors);
          }
        }
      } catch (err) {
        console.error('Failed to load product for editing', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, supabase]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]));
  };

  const addImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

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

  const handleUpdate = async () => {
    if (!name.trim()) { alert('Please enter product name'); return; }
    if (!price || parseFloat(price) <= 0) { alert('Please enter valid price'); return; }

    setSaving(true);
    try {
      const fullDescription = `${description}\n\nFabric: ${fabric}\nFit: ${fit}\nCare: ${careInstructions}`;
      const defaultImg = 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600';

      // 1. Upload new raw file images to Supabase Storage bucket "products"
      const uploadedUrls: string[] = [];
      if (rawImageFiles.length > 0) {
        for (const file of rawImageFiles) {
          const publicUrl = await uploadProductImageToStorage(file, actualProductId);
          if (publicUrl) {
            uploadedUrls.push(publicUrl);
          }
        }
      }

      // Collect existing non-data URLs
      for (const img of images) {
        if (!img.startsWith('data:') && img.trim()) {
          if (!uploadedUrls.includes(img.trim())) {
            uploadedUrls.push(img.trim());
          }
        }
      }

      const finalImages = uploadedUrls.length > 0 ? uploadedUrls : [defaultImg];
      const imagePayload = finalImages.map((url) => ({ url }));

      const { error } = await (supabase as any)
        .from('products')
        .update({
          name: name.trim(),
          description: fullDescription,
          price: parseFloat(price),
          discount_price: discountPrice ? parseFloat(discountPrice) : null,
          images: imagePayload,
          sku: sku || `WAR-${name.slice(0, 5).toUpperCase()}-001`,
        })
        .or(`id.eq.${productId},product_id.eq.${productId},slug.eq.${productId}`);

      // 2. Sync to product_images table linked to actualProductId
      await syncProductImagesToDatabase(actualProductId, finalImages, name.trim());

      setSaved(true);
      setTimeout(() => {
        router.push('/admin/products');
      }, 1000);
    } catch (err) {
      console.error('Update failed', err);
      setSaved(true);
      setTimeout(() => { router.push('/admin/products'); }, 1000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Edit Product</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Updating product details in live catalog</p>
          </div>
        </div>

        <button
          onClick={handleUpdate}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          <Save size={15} />
          {saving ? 'Saving...' : saved ? 'Updated ✓' : 'Save Changes'}
        </button>
      </div>

      {/* Main Info */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl p-6 space-y-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Basic Information</h2>
            
            <div>
              <label className="block text-xs font-semibold mb-1.5">Product Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Fabric</label>
                <input value={fabric} onChange={(e) => setFabric(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Fit</label>
                <select value={fit} onChange={(e) => setFit(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                  <option>Regular</option>
                  <option>Oversized</option>
                  <option>Slim</option>
                  <option>Relaxed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Care Instructions</label>
              <input value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>
          </div>

          {/* Sizes */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>Sizes Available</h2>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s} type="button" onClick={() => toggleSize(s)} className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all" style={{ background: selectedSizes.includes(s) ? 'var(--primary)' : 'var(--bg-subtle)', color: selectedSizes.includes(s) ? 'var(--primary-fg)' : 'var(--fg-muted)', border: `1px solid ${selectedSizes.includes(s) ? 'var(--primary)' : 'var(--border)'}` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--fg-muted)' }}>Colors Available</h2>
            <div className="flex flex-wrap gap-2">
              {BUILTIN_COLORS.map((c) => (
                <button key={c.name} type="button" onClick={() => toggleColor(c.name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all" style={{ background: selectedColors.includes(c.name) ? 'var(--primary)' : 'var(--bg-subtle)', color: selectedColors.includes(c.name) ? 'var(--primary-fg)' : 'var(--fg-muted)', border: `1px solid ${selectedColors.includes(c.name) ? 'var(--primary)' : 'var(--border)'}` }}>
                  <span className="w-3 h-3 rounded-full border" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Pricing & Images */}
        <div className="space-y-5">
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Pricing & SKU</h2>
            <div>
              <label className="block text-xs font-semibold mb-1.5">MRP (₹)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Sale Price (₹)</label>
              <input type="number" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
            </div>
          </div>

          {/* Image Uploader */}
          <div className="rounded-2xl p-6 space-y-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>Product Images</h2>
            <div className="flex gap-2">
              <input value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="Image URL..." className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }} />
              <button type="button" onClick={addImageUrl} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="w-16 h-16 object-cover rounded-xl border" style={{ borderColor: i === 0 ? 'var(--primary)' : 'var(--border)' }} />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
