// ─── Product & Relational Schema Types ───────────────────────────────────────────
export type FitType = 'oversized' | 'regular' | 'slim' | 'relaxed' | string;
export type ProductStatus = 'active' | 'draft' | 'archived';
export type SizeEnum = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL' | string;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string | null;
  image?: string;
  itemCount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Color {
  id: string;
  name: string;
  color_code?: string | null;
  hex?: string;
  created_at?: string;
}

export interface SizeOption {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
}

export interface ProductVariant {
  variant_id: string;
  id?: string;
  product_id: string;
  sku: string;
  color_id?: string | null;
  size_option_id?: string | null;
  color?: string;
  colorHex?: string;
  size?: SizeEnum;
  price: number;
  compare_at_price?: number | null;
  stock_quantity: number;
  status: 'active' | 'inactive';
}

export interface ProductMedia {
  id?: string;
  product_id?: string;
  variant_id?: string | null;
  storage_path?: string;
  url: string;
  alt?: string;
  type: 'image' | 'video';
  mime_type?: string | null;
  sort_order?: number;
}

export interface Product {
  product_id: string;
  id: string;
  sku?: string;
  name: string;
  slug: string;
  description: string;
  fabric?: string | null;
  fit?: string | null;
  pattern?: string | null;
  sleeve_type?: string | null;
  neck_type?: string | null;
  gender?: string | null;
  price: number;
  compare_at_price?: number | null;
  discount_price?: number;
  categories?: Category[];
  category_id?: string;
  category?: Category;
  status: ProductStatus;
  colors?: { name: string; hex: string; color_id?: string }[];
  sizes?: { name: string; size_option_id?: string }[];
  stock_quantity?: number;
  is_in_stock?: boolean;
  tags?: string[];
  rating?: number;
  review_count?: number;
  images: ProductMedia[];
  variants?: ProductVariant[];
  created_at?: string;
  updated_at?: string;
}

// ─── Cart Types ───────────────────────────────────────────────────────────────
export interface CartItem {
  cart_item_id: string;
  id?: string;
  cart_id?: string;
  variant_id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  price: number;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  coupon_code?: string;
  shipping: number;
  tax: number;
  total: number;
}

export interface Cart {
  cart_id?: string;
  items: CartItem[];
  summary: CartSummary;
}

// ─── User / Auth Types ────────────────────────────────────────────────────────
export type UserRole = 'guest' | 'customer' | 'admin' | 'super_admin';

export interface User {
  user_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  dob?: string;
  role: UserRole;
  avatar?: string;
  is_verified: boolean;
  mobile_verified?: boolean;
  email_verified?: boolean;
  created_at?: string;
}

export interface Address {
  address_id?: string;
  id?: string;
  user_id?: string;
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default?: boolean;
}

// ─── Order Types ──────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentMethod = 'upi' | 'card' | 'net_banking' | 'cod' | 'loyalty_points' | string;
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id?: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unit_price: number;
  total_price?: number;
}

export interface Order {
  order_id: string;
  id?: string;
  order_number?: string;
  user_id: string;
  items: OrderItem[];
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  shipping_address: Address;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
}

// ─── Wishlist Types ───────────────────────────────────────────────────────────
export interface WishlistItem {
  wishlist_item_id: string;
  id?: string;
  user_id?: string;
  product_id?: string;
  product: Product;
  added_at: string;
}

// ─── Review Types ─────────────────────────────────────────────────────────────
export interface Review {
  review_id: string;
  user: { name: string; avatar?: string };
  rating: number;
  title?: string;
  body: string;
  images?: string[];
  verified_purchase: boolean;
  created_at: string;
}

// ─── Filter / Search Types ────────────────────────────────────────────────────
export interface ProductFilters {
  category?: string;
  categoryId?: string;
  color?: string[];
  size?: SizeEnum[];
  min_price?: number;
  max_price?: number;
  gender?: string;
  in_stock?: boolean;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
  page?: number;
  limit?: number;
  search?: string;
}

// ─── AI Types ─────────────────────────────────────────────────────────────────
export interface SizeRecommendation {
  recommended_size: SizeEnum;
  confidence: number;
  fit_notes: string[];
}

export interface TryOnResult {
  job_id: string;
  status: 'processing' | 'completed' | 'failed';
  front_view?: string;
  side_view?: string;
  back_view?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  timestamp: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
