/**
 * TypeScript types auto-generated from the ThreadX Supabase schema.
 * Run `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts`
 * to regenerate after schema changes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          avatar_url: string | null;
          role: 'customer' | 'admin' | 'super_admin';
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin' | 'super_admin';
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin' | 'super_admin';
          is_verified?: boolean;
          updated_at?: string;
        };
      };

      categories: {
        Row: {
          id: number;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
        };
      };

      collections: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
        };
      };

      products: {
        Row: {
          id: string;
          sku: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          discount_price: number | null;
          category_id: number | null;
          collection_id: string | null;
          status: 'active' | 'draft' | 'archived';
          fabric: string | null;
          fit_type: 'oversized' | 'regular' | 'slim' | 'relaxed' | null;
          tags: string[] | null;
          is_featured: boolean;
          rating: number | null;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sku: string;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          discount_price?: number | null;
          category_id?: number | null;
          collection_id?: string | null;
          status?: 'active' | 'draft' | 'archived';
          fabric?: string | null;
          fit_type?: 'oversized' | 'regular' | 'slim' | 'relaxed' | null;
          tags?: string[] | null;
          is_featured?: boolean;
        };
        Update: {
          sku?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          discount_price?: number | null;
          category_id?: number | null;
          collection_id?: string | null;
          status?: 'active' | 'draft' | 'archived';
          fabric?: string | null;
          fit_type?: 'oversized' | 'regular' | 'slim' | 'relaxed' | null;
          tags?: string[] | null;
          is_featured?: boolean;
          updated_at?: string;
        };
      };

      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt: string | null;
          type: 'image' | 'video';
          display_order: number;
          created_at: string;
        };
        Insert: {
          product_id: string;
          url: string;
          alt?: string | null;
          type?: 'image' | 'video';
          display_order?: number;
        };
        Update: {
          url?: string;
          alt?: string | null;
          type?: 'image' | 'video';
          display_order?: number;
        };
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          color: string;
          color_hex: string | null;
          size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
          stock_quantity: number;
          price_override: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          product_id: string;
          sku: string;
          color: string;
          color_hex?: string | null;
          size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
          stock_quantity?: number;
          price_override?: number | null;
        };
        Update: {
          color?: string;
          color_hex?: string | null;
          size?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
          stock_quantity?: number;
          price_override?: number | null;
          updated_at?: string;
        };
      };

      addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          address_line_1: string;
          address_line_2: string | null;
          city: string;
          state: string;
          pincode: string;
          country: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          phone: string;
          address_line_1: string;
          address_line_2?: string | null;
          city: string;
          state: string;
          pincode: string;
          country?: string;
          is_default?: boolean;
        };
        Update: {
          full_name?: string;
          phone?: string;
          address_line_1?: string;
          address_line_2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          is_default?: boolean;
        };
      };

      orders: {
        Row: {
          id: string;
          user_id: string;
          status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          discount: number;
          shipping: number;
          tax: number;
          total: number;
          coupon_code: string | null;
          payment_method: 'upi' | 'card' | 'net_banking' | 'cod' | 'wallet';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address: Json;
          tracking_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          discount?: number;
          shipping?: number;
          tax?: number;
          total: number;
          coupon_code?: string | null;
          payment_method: 'upi' | 'card' | 'net_banking' | 'cod' | 'wallet';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address: Json;
          tracking_number?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          tracking_number?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };

      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          order_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: never;
      };

      coupons: {
        Row: {
          id: string;
          code: string;
          type: 'percentage' | 'flat';
          value: number;
          min_order: number;
          max_discount: number | null;
          max_uses: number | null;
          uses_count: number;
          first_time_only: boolean;
          is_active: boolean;
          valid_from: string;
          valid_to: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          type: 'percentage' | 'flat';
          value: number;
          min_order?: number;
          max_discount?: number | null;
          max_uses?: number | null;
          first_time_only?: boolean;
          is_active?: boolean;
          valid_from: string;
          valid_to: string;
          description?: string | null;
        };
        Update: {
          code?: string;
          type?: 'percentage' | 'flat';
          value?: number;
          min_order?: number;
          max_discount?: number | null;
          max_uses?: number | null;
          first_time_only?: boolean;
          is_active?: boolean;
          valid_from?: string;
          valid_to?: string;
          description?: string | null;
          updated_at?: string;
        };
      };

      wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
        };
        Update: never;
      };

      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          status: 'pending' | 'approved' | 'rejected';
          is_verified_purchase: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          product_id: string;
          user_id: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          is_verified_purchase?: boolean;
        };
        Update: {
          rating?: number;
          title?: string | null;
          body?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          updated_at?: string;
        };
      };

      loyalty_points: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          tier: 'bronze' | 'silver' | 'gold' | 'platinum';
          updated_at: string;
        };
        Insert: {
          user_id: string;
          points?: number;
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
        };
        Update: {
          points?: number;
          tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
          updated_at?: string;
        };
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      validate_coupon: {
        Args: { p_code: string; p_user_id: string; p_order_total: number };
        Returns: {
          valid: boolean;
          discount_amount: number;
          message: string;
        };
      };
    };

    Enums: {
      user_role: 'customer' | 'admin' | 'super_admin';
      product_status: 'active' | 'draft' | 'archived';
      order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
      payment_method: 'upi' | 'card' | 'net_banking' | 'cod' | 'wallet';
      size_enum: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL';
      coupon_type: 'percentage' | 'flat';
      review_status: 'pending' | 'approved' | 'rejected';
    };
  };
}
