'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, X, ChevronLeft, Plus } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { getCategories, getCollections, getColors, getSizeOptions } from '@/lib/supabase/queries';
import AttributeSelect from '@/components/admin/AttributeSelect';
import { PRODUCT_ATTRIBUTES, emptyOptions, type OptionsByAttribute } from '@/lib/admin/productOptions';

type Option = { id: string; name: string; color_code?: string | null; sort_order?: number };
type VariantValues = { price: string; compare_at_price: string; stock: string };

export interface ProductFormValues {
  name: string;
  description: string;
  fabric: string;
  fit: string;
  pattern: string;
  sleeve_type: string;
  neck_type: string;
  gender: string;
  status: 'active' | 'draft';
  category_ids: string[];
  collection_ids: string[];
  images: string[];
  /** color_id null = product has no colour options (e.g. printed tees) */
  variants: { color_id: string | null; size_option_id: string; price: number; compare_at_price: number | null; stock: number }[];
  /** '' = use the store default size chart */
  size_chart_id?: string;
}

const EMPTY: ProductFormValues = {
  name: '', description: '', fabric: '', fit: '', pattern: '', sleeve_type: '', neck_type: '', gender: '',
  status: 'draft', category_ids: [], collection_ids: [], images: [], variants: [], size_chart_id: '',
};

const card = { background: 'var(--bg-card)', border: '1px solid var(--border)' };
const field = { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' };
const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none';
const keyOf = (colorId: string | null, sizeId: string) => `${colorId ?? ''}|${sizeId}`;
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

async function postJson(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

/** Create / edit form for products. Everything is saved through the admin API (server-side). */
export default function ProductForm({ productId, initial }: { productId?: string; initial?: ProductFormValues }) {
  const router = useRouter();
  const start = initial ?? EMPTY;
  const [form, setForm] = useState({ ...start });
  const [colors, setColors] = useState<Option[]>([]);
  const [sizes, setSizes] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [collections, setCollections] = useState<Option[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<OptionsByAttribute>(emptyOptions());
  const [sizeCharts, setSizeCharts] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([...new Set(start.variants.map((v) => v.color_id).filter((c): c is string => !!c))]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([...new Set(start.variants.map((v) => v.size_option_id))]);
  const [values, setValues] = useState<Record<string, VariantValues>>(() =>
    Object.fromEntries(start.variants.map((v) => [keyOf(v.color_id, v.size_option_id), {
      price: String(v.price), compare_at_price: v.compare_at_price === null ? '' : String(v.compare_at_price), stock: String(v.stock),
    }])),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newOption, setNewOption] = useState({ kind: 'color', name: '', hex: '#000000' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getColors(), getSizeOptions(), getCategories(), getCollections()]).then(([c, s, cat, col]) => {
      setColors(c as Option[]);
      setSizes(s as Option[]);
      setCategories(cat as Option[]);
      setCollections(col as Option[]);
    });
    fetch('/api/admin/product-options')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.options && setAttributeOptions(data.options))
      .catch(() => {});
    fetch('/api/size-charts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.charts && setSizeCharts(data.charts))
      .catch(() => {});
  }, []);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setForm((f) => ({ ...f, [key]: value }));
  const nameOf = (list: Option[], id: string) => list.find((o) => o.id === id)?.name ?? '';
  const defaultChart = sizeCharts.find((c) => c.is_default);

  const combos = useMemo(
    // No colour picked = one row per size (colour is optional).
    () => (selectedColors.length ? selectedColors : ['']).flatMap((c) =>
      sizes.filter((s) => selectedSizes.includes(s.id)).map((s) => ({ colorId: c, sizeId: s.id }))),
    [selectedColors, selectedSizes, sizes],
  );
  const valueFor = (k: string): VariantValues => values[k] ?? { price: '', compare_at_price: '', stock: '0' };
  const setValue = (k: string, patch: Partial<VariantValues>) => setValues((v) => ({ ...v, [k]: { ...valueFor(k), ...patch } }));
  const applyToAll = (patch: Partial<VariantValues>) =>
    setValues((v) => ({ ...v, ...Object.fromEntries(combos.map(({ colorId, sizeId }) => {
      const k = keyOf(colorId, sizeId);
      return [k, { ...(v[k] ?? { price: '', compare_at_price: '', stock: '0' }), ...patch }];
    })) }));

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append('file', file);
        const res = await fetch('/api/admin/uploads', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Upload failed.');
        setForm((f) => ({ ...f, images: [...f.images, data.url] }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const moveImage = (i: number) => setForm((f) => {
    const images = [...f.images];
    [images[i - 1], images[i]] = [images[i], images[i - 1]];
    return { ...f, images };
  });

  const addOption = async () => {
    setError('');
    try {
      const { option } = await postJson('/api/admin/catalog-options', 'POST', newOption);
      if (newOption.kind === 'color') { setColors((l) => [...l, option]); setSelectedColors((l) => [...l, option.id]); }
      if (newOption.kind === 'size') { setSizes((l) => [...l, option]); setSelectedSizes((l) => [...l, option.id]); }
      if (newOption.kind === 'category') { setCategories((l) => [...l, option]); set('category_ids', [...form.category_ids, option.id]); }
      setNewOption((o) => ({ ...o, name: '' }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const save = async (status: 'active' | 'draft') => {
    setError('');
    setSaving(true);
    try {
      const payload: ProductFormValues = {
        ...form,
        status,
        variants: combos.map(({ colorId, sizeId }) => {
          const v = valueFor(keyOf(colorId, sizeId));
          return {
            color_id: colorId || null,
            size_option_id: sizeId,
            price: Number(v.price),
            compare_at_price: v.compare_at_price === '' ? null : Number(v.compare_at_price),
            stock: Number(v.stock || 0),
          };
        }),
      };
      await postJson(productId ? `/api/admin/products/${productId}` : '/api/admin/products', productId ? 'PUT' : 'POST', payload);
      router.push('/admin/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) => ({
    background: active ? 'var(--primary)' : 'var(--bg-subtle)',
    color: active ? 'var(--primary-fg)' : 'var(--fg-muted)',
    border: '1px solid var(--border)',
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="p-2 rounded-xl" style={{ background: 'var(--bg-subtle)' }} aria-label="Back to products">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{productId ? 'Edit Product' : 'New Product'}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={saving || uploading} onClick={() => save('draft')}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60" style={chip(false)}>
            Save as Draft
          </button>
          <button type="button" disabled={saving || uploading} onClick={() => save('active')}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60" style={chip(true)}>
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      <section className="rounded-2xl p-5 space-y-4" style={card}>
        <h2 className="font-semibold">Basics</h2>
        <label className="block text-sm" style={{ color: 'var(--fg-muted)' }}>
          Product Name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={`${inputCls} mt-1`} style={field} />
        </label>
        <label className="block text-sm" style={{ color: 'var(--fg-muted)' }}>
          Description
          <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${inputCls} mt-1`} style={field} />
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          {PRODUCT_ATTRIBUTES.map(({ key, label }) => (
            <AttributeSelect key={key} label={label} options={attributeOptions[key]} value={form[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-5 space-y-3" style={card}>
        <h2 className="font-semibold">Images</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {form.images.map((url, i) => (
            <div key={url} className="relative aspect-[3/4] rounded-xl overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <ProductImage src={url} alt={`Image ${i + 1}`} sizes="160px" />
              <div className="absolute top-1 right-1 flex gap-1">
                {i > 0 && (
                  <button type="button" onClick={() => moveImage(i)} aria-label={`Move image ${i + 1} left`}
                    className="p-1 rounded-full bg-black/60 text-white"><ChevronLeft size={12} /></button>
                )}
                <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}
                  className="p-1 rounded-full bg-black/60 text-white"><X size={12} /></button>
              </div>
              {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">Main</span>}
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="aspect-[3/4] rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold" style={field}>
            <Upload size={18} /> {uploading ? 'Uploading…' : 'Add images'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden
          onChange={(e) => uploadFiles(e.target.files)} />
      </section>

      <section className="rounded-2xl p-5 space-y-4" style={card}>
        <h2 className="font-semibold">Colours, Sizes, Prices & Stock</h2>
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
            Colours <span className="text-xs">(optional — leave empty for printed or single-design products; customers then see no colour choice)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button key={c.id} type="button" onClick={() => setSelectedColors((l) => toggle(l, c.id))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5" style={chip(selectedColors.includes(c.id))}>
                {c.color_code && <span aria-hidden className="w-3 h-3 rounded-full" style={{ background: c.color_code, border: '1px solid var(--border)' }} />}
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>Sizes</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s.id} type="button" onClick={() => setSelectedSizes((l) => toggle(l, s.id))}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={chip(selectedSizes.includes(s.id))}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {combos.length > 0 && (
          <div className="overflow-x-auto">
            <div className="flex flex-wrap gap-2 mb-3 text-xs">
              <input placeholder="Selling price for all" type="number" min={1} className="px-3 py-1.5 rounded-lg w-40" style={field}
                onBlur={(e) => e.target.value && applyToAll({ price: e.target.value })} />
              <input placeholder="MRP for all (optional)" type="number" min={1} className="px-3 py-1.5 rounded-lg w-44" style={field}
                onBlur={(e) => applyToAll({ compare_at_price: e.target.value })} />
              <input placeholder="Stock for all" type="number" min={0} className="px-3 py-1.5 rounded-lg w-32" style={field}
                onBlur={(e) => e.target.value && applyToAll({ stock: e.target.value })} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'var(--fg-muted)' }}>
                  <th className="text-left py-2">Variant</th><th className="text-left">Selling price (₹)</th><th className="text-left">MRP (₹)</th><th className="text-left">Stock</th>
                </tr>
              </thead>
              <tbody>
                {combos.map(({ colorId, sizeId }) => {
                  const k = keyOf(colorId, sizeId);
                  const label = colorId ? `${nameOf(colors, colorId)} / ${nameOf(sizes, sizeId)}` : nameOf(sizes, sizeId);
                  const v = valueFor(k);
                  return (
                    <tr key={k} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="py-2 pr-3 font-semibold">{label}</td>
                      <td className="pr-2"><input aria-label={`Selling price for ${label}`} type="number" min={1} value={v.price}
                        onChange={(e) => setValue(k, { price: e.target.value })} className="px-2 py-1.5 rounded-lg w-28" style={field} /></td>
                      <td className="pr-2"><input aria-label={`MRP for ${label}`} type="number" min={1} value={v.compare_at_price}
                        onChange={(e) => setValue(k, { compare_at_price: e.target.value })} className="px-2 py-1.5 rounded-lg w-28" style={field} /></td>
                      <td><input aria-label={`Stock for ${label}`} type="number" min={0} value={v.stock}
                        onChange={(e) => setValue(k, { stock: e.target.value })} className="px-2 py-1.5 rounded-lg w-24" style={field} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl p-5" style={card}>
        <h2 className="font-semibold mb-1">Size chart</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
          Shown when customers tap &ldquo;Size guide&rdquo; on this product. Create and edit charts under <Link href="/admin/size-charts" className="underline">Size Charts</Link>.
        </p>
        <select aria-label="Size chart" value={form.size_chart_id ?? ''} onChange={(e) => set('size_chart_id', e.target.value)} className={inputCls} style={field}>
          <option value="">
            {defaultChart ? `Store default (${defaultChart.name})` : 'Store default (none set)'}
          </option>
          {sizeCharts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </section>

      <section className="rounded-2xl p-5 grid sm:grid-cols-2 gap-6" style={card}>
        <div>
          <h2 className="font-semibold mb-2">Categories</h2>
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm py-1">
              <input type="checkbox" checked={form.category_ids.includes(c.id)} onChange={() => set('category_ids', toggle(form.category_ids, c.id))} />
              {c.name}
            </label>
          ))}
        </div>
        <div>
          <h2 className="font-semibold mb-2">Collections</h2>
          {collections.length === 0 && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>No collections yet — create them under Collections.</p>}
          {collections.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm py-1">
              <input type="checkbox" checked={form.collection_ids.includes(c.id)} onChange={() => set('collection_ids', toggle(form.collection_ids, c.id))} />
              {c.name}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-5" style={card}>
        <h2 className="font-semibold mb-3">Add a new colour, size or category</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Option type" value={newOption.kind} onChange={(e) => setNewOption((o) => ({ ...o, kind: e.target.value }))}
            className="px-3 py-2 rounded-lg text-sm" style={field}>
            <option value="color">Colour</option><option value="size">Size</option><option value="category">Category</option>
          </select>
          <input aria-label="New option name" placeholder="Name" value={newOption.name}
            onChange={(e) => setNewOption((o) => ({ ...o, name: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={field} />
          {newOption.kind === 'color' && (
            <input aria-label="Colour" type="color" value={newOption.hex} onChange={(e) => setNewOption((o) => ({ ...o, hex: e.target.value }))} />
          )}
          <button type="button" onClick={addOption} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold" style={chip(true)}>
            <Plus size={14} /> Add
          </button>
        </div>
      </section>
    </div>
  );
}
