// ─── Product Types ───────────────────────────────────────────────────────────
export type FitType = 'oversized' | 'regular' | 'slim' | 'relaxed';
export type ProductStatus = 'active' | 'draft' | 'archived';
export type SizeEnum = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  itemCount?: number;
}

export interface ProductVariant {
  variant_id: string;
  product_id: string;
  sku: string;
  color: string;
  colorHex?: string;
  size: SizeEnum;
  stock_quantity: number;
  price_override?: number;
}

export interface ProductMedia {
  url: string;
  alt?: string;
  type: 'image' | 'video';
}

export interface Product {
  product_id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discount_price?: number;
  category_id: number;
  category?: Category;
  status: ProductStatus;
  color?: string;
  colors?: { name: string; hex: string }[];
  size?: SizeEnum;
  fabric?: string;
  material?: string;
  weight?: number;
  fit_type?: FitType;
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
export type PaymentMethod = 'upi' | 'card' | 'net_banking' | 'cod' | 'loyalty_points';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  unit_price: number;
}

export interface Order {
  order_id: string;
  order_number: string;
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
  color?: string[];
  size?: SizeEnum[];
  min_price?: number;
  max_price?: number;
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
