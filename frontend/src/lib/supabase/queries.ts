import type { Database } from '@/lib/supabase/database.types';

async function getSupabaseClient() {
  const { createClient } = await import('@/lib/supabase/client');
  return createClient();
}

export function getPublicStorageUrl(path?: string | null, fallbackId = ''): string {
  if (!path || path.trim() === '') {
    const placeholders = [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600',
      'https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=600',
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600',
    ];
    let charCodeSum = 0;
    for (let i = 0; i < fallbackId.length; i++) charCodeSum += fallbackId.charCodeAt(i);
    return placeholders[charCodeSum % placeholders.length];
  }

  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) return path;

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${supabaseUrl}/storage/v1/object/public/products/${cleanPath}`;
}

export function normalizeProduct(row: any): any {
  if (!row) return null;

  // Categories mapping via product_categories junction table or single relation
  let categories: any[] = [];
  if (Array.isArray(row.product_categories)) {
    categories = row.product_categories
      .map((pc: any) => pc.category || pc.categories || pc)
      .filter(Boolean);
  } else if (row.category) {
    categories = [row.category];
  }

  const primaryCategory = categories[0] || null;

  // Media mapping from product_media or row.images or row.image_url
  const rawMedia = Array.isArray(row.product_media)
    ? row.product_media
    : Array.isArray(row.images)
    ? row.images
    : [];

  let images: any[] = [];
  if (rawMedia.length > 0) {
    images = rawMedia
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m: any) => ({
        id: m.id,
        url: getPublicStorageUrl(m.storage_path || m.url || m.image_url, row.id || row.slug),
        alt: m.alt_text || m.alt || row.name,
        type: m.media_type || m.type || 'image',
      }));
  } else if (row.image_url) {
    images = [{ url: getPublicStorageUrl(row.image_url, row.id || row.slug), alt: row.name, type: 'image' }];
  } else {
    images = [{ url: getPublicStorageUrl(null, row.id || row.slug), alt: row.name, type: 'image' }];
  }

  // Variants mapping & Price extraction
  const rawVariants = Array.isArray(row.product_variants)
    ? row.product_variants
    : Array.isArray(row.variants)
    ? row.variants
    : [];

  let minPrice = Infinity;
  let maxCompareAtPrice: number | undefined = undefined;
  let totalStock = 0;
  const uniqueColorsMap = new Map<string, { name: string; hex: string; color_id?: string }>();
  const uniqueSizesMap = new Map<string, { name: string; size_option_id?: string }>();

  const variants = rawVariants.map((v: any) => {
    const rawP = v.price ?? v.price_override ?? row.price;
    const priceNum = Number(rawP);
    const price = !isNaN(priceNum) && priceNum >= 0 ? priceNum : 0;

    const rawCompare = v.compare_at_price ?? row.compare_at_price;
    const compareNum = Number(rawCompare);
    const compareAt = !isNaN(compareNum) && compareNum > 0 ? compareNum : undefined;

    if (price > 0 && price < minPrice) minPrice = price;
    if (compareAt && compareAt > price && (!maxCompareAtPrice || compareAt > maxCompareAtPrice)) {
      maxCompareAtPrice = compareAt;
    }

    const colorName = v.color?.name || v.color || 'Default';
    const colorHex = v.color?.color_code || v.color_hex || '#000000';
    if (!uniqueColorsMap.has(colorName)) {
      uniqueColorsMap.set(colorName, { name: colorName, hex: colorHex, color_id: v.color_id });
    }

    const sizeName = v.size_option?.name || v.size || 'Free Size';
    if (!uniqueSizesMap.has(sizeName)) {
      uniqueSizesMap.set(sizeName, { name: sizeName, size_option_id: v.size_option_id });
    }

    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
    const stockQty = inv ? Math.max(0, (inv.quantity || 0) - (inv.reserved_quantity || 0)) : Number(v.stock_quantity || 0);
    totalStock += stockQty;

    return {
      variant_id: v.id,
      id: v.id,
      product_id: v.product_id || row.id,
      sku: v.sku,
      color_id: v.color_id,
      size_option_id: v.size_option_id,
      color: colorName,
      colorHex,
      size: sizeName,
      price,
      compare_at_price: compareAt,
      stock_quantity: stockQty,
      status: v.status || 'active',
    };
  });

  const sellingPrice = minPrice !== Infinity && minPrice > 0 ? minPrice : Number(row.price || 0);
  const comparePrice = maxCompareAtPrice && maxCompareAtPrice > sellingPrice ? maxCompareAtPrice : undefined;

  return {
    product_id: row.id,
    id: row.id,
    sku: row.sku || `WAR-${row.id.slice(0, 5).toUpperCase()}`,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    fabric: row.fabric ?? undefined,
    fit: row.fit ?? undefined,
    fit_type: row.fit ?? undefined,
    pattern: row.pattern ?? undefined,
    sleeve_type: row.sleeve_type ?? undefined,
    neck_type: row.neck_type ?? undefined,
    gender: row.gender ?? undefined,
    status: row.status ?? 'active',
    price: sellingPrice,
    compare_at_price: comparePrice,
    discount_price: comparePrice ? sellingPrice : undefined,
    categories,
    category_id: primaryCategory?.id ?? undefined,
    category: primaryCategory,
    colors: Array.from(uniqueColorsMap.values()),
    sizes: Array.from(uniqueSizesMap.values()),
    stock_quantity: totalStock,
    is_in_stock: totalStock > 0 || (row.status === 'active' && variants.length === 0),
    rating: row.rating ? Number(row.rating) : undefined,
    review_count: row.review_count && Number(row.review_count) > 0 ? Number(row.review_count) : undefined,
    images,
    variants,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Products Queries ─────────────────────────────────────────────────────────

export async function getProducts(options?: {
  category?: string;
  categoryId?: string;
  gender?: string;
  status?: 'active' | 'draft' | 'archived';
  fitType?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'name';
  ascending?: boolean;
}) {
  try {
    const supabase = await getSupabaseClient();

    let query = supabase
      .from('products')
      .select(`
        *,
        product_categories(
          category:categories(*)
        ),
        product_media(*),
        product_variants(
          *,
          color:colors(*),
          size_option:size_options(*),
          inventory(*)
        )
      `)
      .eq('status', options?.status ?? 'active');

    if (options?.gender) {
      query = query.eq('gender', options.gender);
    }
    if (options?.fitType) {
      query = query.eq('fit', options.fitType);
    }
    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options?.ascending ?? false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      let products = data.map(normalizeProduct);

      if (options?.category) {
        products = products.filter((p: any) =>
          p.categories.some((c: any) => c.slug === options.category || c.name.toLowerCase() === options.category?.toLowerCase())
        );
      }
      if (options?.categoryId) {
        products = products.filter((p: any) =>
          p.categories.some((c: any) => c.id === options.categoryId)
        );
      }
      if (options?.minPrice !== undefined) {
        products = products.filter((p: any) => p.price >= options.minPrice!);
      }
      if (options?.maxPrice !== undefined) {
        products = products.filter((p: any) => p.price <= options.maxPrice!);
      }

      return products;
    }
  } catch (err) {
    console.error('Supabase getProducts error:', err);
  }

  return [];
}

export async function getProductBySlug(slug: string) {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await (supabase as any)
      .from('products')
      .select(`
        *,
        product_categories(
          category:categories(*)
        ),
        product_media(*),
        product_variants(
          *,
          color:colors(*),
          size_option:size_options(*),
          inventory(*)
        )
      `)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('getProductBySlug error:', error);
      return null;
    }
    if (!data) return null;

    return normalizeProduct(data);
  } catch (err) {
    console.error('Supabase getProductBySlug error:', err);
  }
  return null;
}

export async function getFeaturedProducts(limit = 4) {
  return getProducts({ limit });
}

export async function getBestSellers(limit = 4) {
  return getProducts({ limit });
}

// ─── Categories Queries ───────────────────────────────────────────────────────

export async function getCategories() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.error('Supabase getCategories error:', err);
  }
  return [];
}

// ─── Collections Queries ──────────────────────────────────────────────────────

export async function getCollections() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.error('Supabase getCollections error:', err);
  }
  return [];
}

// ─── Colors & Size Options Queries ────────────────────────────────────────────

export async function getColors() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('colors')
      .select('*')
      .order('name');
    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.error('Supabase getColors error:', err);
  }
  return [];
}

export async function getSizeOptions() {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('size_options')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    if (data) return data;
  } catch (err) {
    console.error('Supabase getSizeOptions error:', err);
  }
  return [];
}

// ─── Database-Persisted Cart Queries ──────────────────────────────────────────

export async function getOrCreateActiveCartId(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const supabase = await getSupabaseClient();
    
    // Check if active cart exists
    const { data: existing, error: fetchErr } = await (supabase as any)
      .from('carts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) console.error('fetch active cart error:', fetchErr);
    if (existing?.id) return existing.id;

    // Insert new active cart
    const { data: created, error: createErr } = await (supabase as any)
      .from('carts')
      .insert({ user_id: userId, status: 'active' })
      .select('id')
      .single();

    if (createErr) {
      console.error('create active cart error:', createErr);
      return null;
    }
    return created?.id || null;
  } catch (err) {
    console.error('getOrCreateActiveCartId exception:', err);
    return null;
  }
}

export async function syncCartItemToDb(userId: string, variantId: string, quantity: number): Promise<boolean> {
  if (!userId || !variantId) return false;
  try {
    const cartId = await getOrCreateActiveCartId(userId);
    if (!cartId) return false;

    const supabase = await getSupabaseClient();

    if (quantity <= 0) {
      await (supabase as any)
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)
        .eq('variant_id', variantId);
      return true;
    }

    const { data: existing } = await (supabase as any)
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('variant_id', variantId)
      .maybeSingle();

    if (existing?.id) {
      await (supabase as any)
        .from('cart_items')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await (supabase as any)
        .from('cart_items')
        .insert({ cart_id: cartId, variant_id: variantId, quantity });
    }
    return true;
  } catch (err) {
    console.error('syncCartItemToDb error:', err);
    return false;
  }
}

export async function removeCartItemFromDb(userId: string, variantId: string): Promise<boolean> {
  if (!userId || !variantId) return false;
  try {
    const cartId = await getOrCreateActiveCartId(userId);
    if (!cartId) return false;

    const supabase = await getSupabaseClient();
    await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('variant_id', variantId);
    return true;
  } catch (err) {
    console.error('removeCartItemFromDb error:', err);
    return false;
  }
}

export async function clearCartInDb(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const cartId = await getOrCreateActiveCartId(userId);
    if (!cartId) return false;

    const supabase = await getSupabaseClient();
    await (supabase as any)
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);
    return true;
  } catch (err) {
    console.error('clearCartInDb error:', err);
    return false;
  }
}

export async function fetchUserCartFromDb(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const cartId = await getOrCreateActiveCartId(userId);
    if (!cartId) return [];

    const supabase = await getSupabaseClient();
    const { data: rawItems, error } = await (supabase as any)
      .from('cart_items')
      .select(`
        *,
        variant:product_variants(
          *,
          color:colors(*),
          size_option:size_options(*),
          product:products(
            *,
            product_categories(category:categories(*)),
            product_media(*)
          )
        )
      `)
      .eq('cart_id', cartId);

    if (error) {
      console.error('fetchUserCartFromDb error:', error);
      return [];
    }

    if (!rawItems || rawItems.length === 0) return [];

    return rawItems
      .filter((item: any) => item.variant && item.variant.product)
      .map((item: any) => {
        const p = normalizeProduct(item.variant.product);
        const v = item.variant;
        const colorName = v.color?.name || 'Default';
        const colorHex = v.color?.color_code || '#000000';
        const sizeName = v.size_option?.name || 'Free Size';

        const variantObj = {
          variant_id: v.id,
          id: v.id,
          product_id: v.product_id || p.id,
          sku: v.sku,
          color: colorName,
          colorHex,
          size: sizeName,
          price: Number(v.price ?? p.price),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : undefined,
          stock_quantity: 50,
          status: v.status || 'active',
        };

        return {
          cart_item_id: item.id,
          id: item.id,
          cart_id: cartId,
          variant_id: v.id,
          quantity: item.quantity,
          price: Number(v.price ?? p.price),
          variant: variantObj,
          product: p,
        };
      });
  } catch (err) {
    console.error('fetchUserCartFromDb exception:', err);
    return [];
  }
}

// ─── Orders Queries ───────────────────────────────────────────────────────────

export async function getUserOrders(userId: string) {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:products(*),
          variant:product_variants(*, color:colors(*), size_option:size_options(*))
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getUserOrders error:', err);
    return [];
  }
}

export async function createOrder(
  order: Database['public']['Tables']['orders']['Insert'],
  items: Omit<Database['public']['Tables']['order_items']['Insert'], 'order_id'>[]
) {
  const supabase = await getSupabaseClient();

  const { data: newOrder, error: orderError } = await (supabase as any)
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map((item) => ({ ...item, order_id: (newOrder as { id: string }).id }));
  const { error: itemsError } = await (supabase as any).from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return newOrder as Database['public']['Tables']['orders']['Row'];
}

// ─── Wishlist Queries ─────────────────────────────────────────────────────────

export async function getWishlist(userId: string) {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('wishlist')
      .select(`
        *,
        product:products(
          *,
          product_categories(category:categories(*)),
          product_media(*),
          product_variants(*, color:colors(*), size_option:size_options(*), inventory(*))
        )
      `)
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((w: any) => ({
      wishlist_item_id: w.id,
      product: normalizeProduct(w.product),
      added_at: w.created_at,
    }));
  } catch (err) {
    console.error('getWishlist error:', err);
    return [];
  }
}

export async function toggleWishlist(userId: string, productId: string) {
  const supabase = await getSupabaseClient();

  const { data: existing } = await supabase
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await supabase.from('wishlist').delete().eq('id', (existing as { id: string }).id);
    return false;
  } else {
    await (supabase as any).from('wishlist').insert({ user_id: userId, product_id: productId });
    return true;
  }
}

// ─── Admin Queries ────────────────────────────────────────────────────────────

export async function adminGetAllOrders() {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`*, profile:profiles(name, email)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: Database['public']['Tables']['orders']['Update']['status']
) {
  const supabase = await getSupabaseClient();
  const { error } = await (supabase as any)
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function adminGetDashboardStats() {
  const supabase = await getSupabaseClient();

  const [ordersRes, productsRes, customersRes] = await Promise.all([
    supabase.from('orders').select('total, status, created_at').gte(
      'created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    ),
    supabase.from('products').select('id, status').eq('status', 'active'),
    supabase.from('profiles').select('id, created_at').eq('role', 'customer' as never),
  ]);

  const orders = (ordersRes.data ?? []) as Array<{ total: number; status: string; created_at: string }>;
  const revenue = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return {
    revenue,
    orderCount: orders.length,
    activeProducts: productsRes.data?.length ?? 0,
    customerCount: customersRes.data?.length ?? 0,
  };
}
