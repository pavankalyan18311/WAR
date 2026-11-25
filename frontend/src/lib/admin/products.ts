import { PRODUCT_ATTRIBUTES, tidyOption } from './productOptions';
import { getPublicStorageUrl } from '@/lib/supabase/queries';
import { notifyRestocked } from '@/lib/stockAlerts';

/** A problem with the product form that the admin can fix — routes return it as a 400. */
export class ProductInputError extends Error {}

export interface VariantInput {
  /** null = no colour (e.g. printed tees) */
  color_id: string | null;
  size_option_id: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
}

export interface ProductInput {
  name: string;
  description: string | null;
  fabric: string | null;
  fit: string | null;
  pattern: string | null;
  sleeve_type: string | null;
  neck_type: string | null;
  gender: string | null;
  status: 'active' | 'draft';
  category_ids: string[];
  collection_ids: string[];
  images: string[];
  variants: VariantInput[];
  /** null = use the store default size chart */
  size_chart_id?: string | null;
}

const variantKey = (colorId: string | null | undefined, sizeId: string) => `${colorId ?? ''}|${sizeId}`;
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && x))] : []);

export function parseProductInput(body: any): ProductInput {
  const fail = (msg: string): never => { throw new ProductInputError(msg); };

  const name = text(body?.name) ?? fail('Product name is required.');
  const status = body?.status;
  if (status !== 'active' && status !== 'draft') fail('Status must be active or draft.');

  const images = Array.isArray(body?.images) ? body.images.map((u: unknown) => String(u).trim()).filter(Boolean) : [];
  if (images.some((u: string) => !u.startsWith('https://'))) fail('Images must be https links.');

  const rawVariants = Array.isArray(body?.variants) ? body.variants : [];
  if (rawVariants.length === 0) fail('Add at least one size/colour with a price.');

  const seen = new Set<string>();
  const variants: VariantInput[] = rawVariants.map((v: any) => {
    if (!v?.size_option_id) fail('Every variant needs a size.');
    const color_id = typeof v.color_id === 'string' && v.color_id ? v.color_id : null;
    const key = variantKey(color_id, v.size_option_id);
    if (seen.has(key)) fail('Each colour + size combination can only be added once.');
    seen.add(key);

    const price = Number(v.price);
    if (!Number.isFinite(price) || price <= 0) fail('Every size needs a selling price above ₹0.');
    const compare = v.compare_at_price === null || v.compare_at_price === '' || v.compare_at_price === undefined
      ? null
      : Number(v.compare_at_price);
    if (compare !== null && (!Number.isFinite(compare) || compare <= price)) fail('MRP must be higher than the selling price.');
    const stock = Number(v.stock);
    if (!Number.isInteger(stock) || stock < 0) fail('Stock cannot be negative.');

    return { color_id, size_option_id: v.size_option_id, price, compare_at_price: compare, stock };
  });

  return {
    name,
    description: text(body?.description),
    fabric: text(body?.fabric) && tidyOption(body.fabric),
    fit: text(body?.fit) && tidyOption(body.fit),
    pattern: text(body?.pattern) && tidyOption(body.pattern),
    sleeve_type: text(body?.sleeve_type) && tidyOption(body.sleeve_type),
    neck_type: text(body?.neck_type) && tidyOption(body.neck_type),
    gender: text(body?.gender) && tidyOption(body.gender),
    status,
    category_ids: ids(body?.category_ids),
    collection_ids: ids(body?.collection_ids),
    images,
    variants,
    size_chart_id: text(body?.size_chart_id),
  };
}

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  category: string | null;
  image: string;
  price: number | null;
  stock: number;
  variants: number;
  sales: number;
}

/** One row of the admin product list, built only from real data (blank when unknown). */
export function toAdminProductRow(p: any, salesByProduct: Map<string, number>): AdminProductRow {
  const active = (p.product_variants ?? []).filter((v: any) => v.status === 'active');
  const qty = (v: any) => Number((Array.isArray(v.inventory) ? v.inventory[0] : v.inventory)?.quantity ?? 0);
  const prices = active.map((v: any) => Number(v.price)).filter((n: number) => n > 0);
  const media = [...(p.product_media ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    category: p.product_categories?.[0]?.category?.name ?? null,
    image: getPublicStorageUrl(media[0]?.storage_path),
    price: prices.length ? Math.min(...prices) : null,
    stock: active.reduce((sum: number, v: any) => sum + qty(v), 0),
    variants: active.length,
    sales: salesByProduct.get(p.id) ?? 0,
  };
}

export const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

/** Throws on a Supabase error so a half-saved product is never reported as saved. */
async function run<T extends { error: any; data?: any }>(query: PromiseLike<T>): Promise<T> {
  const result = await query;
  if (result.error) throw new Error(result.error.message ?? 'Database error');
  return result;
}

/**
 * Creates (no productId) or updates a product and everything attached to it.
 * Server-only: call with the service-role client after requireAdmin().
 * Variants are never deleted (orders reference them) — removed ones become inactive.
 */
export async function saveProduct(supabase: any, input: ProductInput, productId?: string): Promise<string> {
  const fields = {
    name: input.name,
    description: input.description,
    fabric: input.fabric,
    fit: input.fit,
    pattern: input.pattern,
    sleeve_type: input.sleeve_type,
    neck_type: input.neck_type,
    gender: input.gender,
    status: input.status,
    size_chart_id: input.size_chart_id ?? null,
    updated_at: new Date().toISOString(),
  };

  const id = productId ?? crypto.randomUUID();
  if (productId) {
    await run(supabase.from('products').update(fields).eq('id', id));
  } else {
    await run(supabase.from('products').insert({ id, slug: `${slugify(input.name)}-${id.slice(0, 4)}`, ...fields }));
  }

  // Replace simple relations
  await run(supabase.from('product_categories').delete().eq('product_id', id));
  if (input.category_ids.length) {
    await run(supabase.from('product_categories').insert(input.category_ids.map((category_id) => ({ product_id: id, category_id }))));
  }
  await run(supabase.from('product_collections').delete().eq('product_id', id));
  if (input.collection_ids.length) {
    await run(supabase.from('product_collections').insert(input.collection_ids.map((collection_id) => ({ product_id: id, collection_id }))));
  }
  await run(supabase.from('product_media').delete().eq('product_id', id));
  if (input.images.length) {
    await run(supabase.from('product_media').insert(input.images.map((url, sort_order) => ({
      product_id: id, storage_path: url, media_type: 'image', alt_text: input.name, sort_order,
    }))));
  }

  // Variants: update matching colour+size, insert new ones, deactivate the rest
  const { data: existing } = await run(supabase.from('product_variants').select('id, color_id, size_option_id').eq('product_id', id));
  const byKey = new Map<string, string>((existing ?? []).map((v: any) => [variantKey(v.color_id, v.size_option_id), v.id]));
  const keep = new Set<string>();
  const restocked: string[] = []; // sizes going from sold out to in stock → email "notify me" requests

  for (const v of input.variants) {
    const values = { price: v.price, compare_at_price: v.compare_at_price, status: 'active', updated_at: new Date().toISOString() };
    let variantId = byKey.get(variantKey(v.color_id, v.size_option_id));
    if (variantId) {
      await run(supabase.from('product_variants').update(values).eq('id', variantId));
    } else {
      const sku = `WAR-${id.slice(0, 6)}-${(v.color_id ?? 'NC').slice(0, 4)}-${v.size_option_id.slice(0, 4)}`.toUpperCase();
      const { data } = await run(supabase.from('product_variants').insert({
        product_id: id, color_id: v.color_id, size_option_id: v.size_option_id, sku, ...values,
      }).select('id').single());
      variantId = data.id as string;
    }
    keep.add(variantId);
    const { data: inv } = await run(supabase.from('inventory').select('id, quantity').eq('variant_id', variantId));
    if (inv?.length) {
      if (Number(inv[0].quantity ?? 0) <= 0 && v.stock > 0) restocked.push(variantId);
      // The stock the admin types is what can be sold. Checkout takes stock straight from `quantity`
      // and never reserves, so any reserved_quantity is stale — and the DB rejects quantity < reserved.
      await run(supabase.from('inventory')
        .update({ quantity: v.stock, reserved_quantity: 0, updated_at: new Date().toISOString() })
        .eq('variant_id', variantId));
    } else {
      await run(supabase.from('inventory').insert({ variant_id: variantId, quantity: v.stock, reserved_quantity: 0 }));
    }
  }

  for (const variantId of byKey.values()) {
    if (!keep.has(variantId)) {
      await run(supabase.from('product_variants').update({ status: 'inactive' }).eq('id', variantId));
    }
  }

  // Tell customers waiting for restocked sizes. Best-effort: never fails the save.
  if (restocked.length) {
    try {
      await notifyRestocked(supabase, restocked);
    } catch (err: any) {
      console.warn('Back-in-stock emails failed:', err?.message);
    }
  }

  // Remember typed values ("Other…") so they appear in the dropdown next time. Best-effort.
  const optionRows = PRODUCT_ATTRIBUTES
    .map(({ key }) => ({ attribute: key, value: input[key] ? tidyOption(input[key]) : '' }))
    .filter((o) => o.value);
  if (optionRows.length) {
    const { error } = await supabase
      .from('product_attribute_options')
      .upsert(optionRows.map((o) => ({ ...o, sort_order: 100 })), { onConflict: 'attribute,value', ignoreDuplicates: true });
    if (error) console.warn('Could not remember product options:', error.message);
  }

  return id;
}
