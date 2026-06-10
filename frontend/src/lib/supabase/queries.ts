import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductWithRelations = Product & {
  category: Database['public']['Tables']['categories']['Row'] | null;
  images: Database['public']['Tables']['product_images']['Row'][];
  variants: Database['public']['Tables']['product_variants']['Row'][];
};

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(options?: {
  category?: string;
  status?: 'active' | 'draft' | 'archived';
  featured?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'price' | 'rating';
  ascending?: boolean;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(* order by display_order asc),
      variants:product_variants(*)
    `)
    .eq('status', options?.status ?? 'active');

  if (options?.category) {
    query = query.eq('category.slug', options.category);
  }
  if (options?.featured) {
    query = query.eq('is_featured', true);
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
  return data as ProductWithRelations[];
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      images:product_images(* order by display_order asc),
      variants:product_variants(*)
    `)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as ProductWithRelations;
}

export async function getFeaturedProducts(limit = 4) {
  return getProducts({ featured: true, limit });
}

export async function getBestSellers(limit = 4) {
  return getProducts({ orderBy: 'rating', limit });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data;
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function getCollections() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getUserOrders(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        product:products(id, name, slug, images:product_images(url order by display_order limit 1)),
        variant:product_variants(size, color, color_hex)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createOrder(
  order: Database['public']['Tables']['orders']['Insert'],
  items: Omit<Database['public']['Tables']['order_items']['Insert'], 'order_id'>[]
) {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newOrder, error: orderError } = await (supabase as any)
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (orderError) throw orderError;

  const orderItems = items.map((item) => ({ ...item, order_id: (newOrder as { id: string }).id }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: itemsError } = await (supabase as any).from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return newOrder as Database['public']['Tables']['orders']['Row'];
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export async function getWishlist(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('wishlist')
    .select(`
      *,
      product:products(
        *,
        images:product_images(url order by display_order limit 1),
        variants:product_variants(*)
      )
    `)
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function toggleWishlist(userId: string, productId: string) {
  const supabase = await createClient();

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('wishlist').insert({ user_id: userId, product_id: productId });
    return true;
  }
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function validateCoupon(code: string, userId: string, orderTotal: number) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('validate_coupon', {
    p_code: code,
    p_user_id: userId,
    p_order_total: orderTotal,
  });
  if (error) throw error;
  return data as { valid: boolean; discount_amount: number; message: string };
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getProductReviews(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select(`*, profile:profiles(name, avatar_url)`)
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ─── Admin queries ────────────────────────────────────────────────────────────

export async function adminGetAllOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`*, profile:profiles(name, email)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: Database['public']['Tables']['orders']['Update']['status']
) {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function adminGetDashboardStats() {
  const supabase = await createClient();

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
