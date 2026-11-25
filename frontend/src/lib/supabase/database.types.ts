export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      email_otps: {
        Row: {
          id: string;
          email: string;
          password: string;
          first_name: string | null;
          last_name: string | null;
          dob: string | null;
          otp: string | null;
          expires_at: string | null;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password: string;
          first_name?: string | null;
          last_name?: string | null;
          dob?: string | null;
          otp?: string | null;
          expires_at?: string | null;
          verified?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string;
          password?: string;
          first_name?: string | null;
          last_name?: string | null;
          dob?: string | null;
          otp?: string | null;
          expires_at?: string | null;
          verified?: boolean;
        };
        Relationships: [];
      };

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
        Relationships: [];
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
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
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
          id?: string;
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
          created_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
          address_line_1?: string;
          address_line_2?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          is_default?: boolean;
        };
        Relationships: [];
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
          payment_method: string;
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address: Json;
          tracking_number: string | null;
          notes: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          subtotal: number;
          discount?: number;
          shipping?: number;
          tax?: number;
          total: number;
          coupon_code?: string | null;
          payment_method: string;
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          shipping_address: Json;
          tracking_number?: string | null;
          notes?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          tracking_number?: string | null;
          notes?: string | null;
          payment_method?: string;
          razorpay_payment_id?: string | null;
          total?: number;
          updated_at?: string;
        };
        Relationships: [];
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
          status: 'active' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          status?: 'active' | 'cancelled';
          created_at?: string;
        };
        Update: {
          status?: 'active' | 'cancelled';
        };
        Relationships: [];
      };

      store_settings: {
        Row: {
          id: number;
          free_shipping_threshold: number;
          shipping_fee: number;
          cod_enabled: boolean;
          auth_popup: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          free_shipping_threshold?: number;
          shipping_fee?: number;
          cod_enabled?: boolean;
          auth_popup?: Json;
          updated_at?: string;
        };
        Update: {
          free_shipping_threshold?: number;
          shipping_fee?: number;
          cod_enabled?: boolean;
          auth_popup?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      product_collections: {
        Row: { product_id: string; collection_id: string };
        Insert: { product_id: string; collection_id: string };
        Update: never;
        Relationships: [];
      };

      wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };

      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          parent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          fabric: string | null;
          fit: string | null;
          pattern: string | null;
          sleeve_type: string | null;
          neck_type: string | null;
          gender: string | null;
          status: 'draft' | 'active' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          fabric?: string | null;
          fit?: string | null;
          pattern?: string | null;
          sleeve_type?: string | null;
          neck_type?: string | null;
          gender?: string | null;
          status?: 'draft' | 'active' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          fabric?: string | null;
          fit?: string | null;
          pattern?: string | null;
          sleeve_type?: string | null;
          neck_type?: string | null;
          gender?: string | null;
          status?: 'draft' | 'active' | 'archived';
          updated_at?: string;
        };
        Relationships: [];
      };

      product_categories: {
        Row: {
          product_id: string;
          category_id: string;
        };
        Insert: {
          product_id: string;
          category_id: string;
        };
        Update: {
          product_id?: string;
          category_id?: string;
        };
        Relationships: [];
      };

      size_options: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };

      category_size_options: {
        Row: {
          category_id: string;
          size_option_id: string;
          sort_order: number;
        };
        Insert: {
          category_id: string;
          size_option_id: string;
          sort_order?: number;
        };
        Update: {
          sort_order?: number;
        };
        Relationships: [];
      };

      colors: {
        Row: {
          id: string;
          name: string;
          color_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color_code?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          color_code?: string | null;
        };
        Relationships: [];
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string;
          color_id: string | null;
          size_option_id: string | null;
          sku: string;
          price: number;
          compare_at_price: number | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          color_id?: string | null;
          size_option_id?: string | null;
          sku: string;
          price: number;
          compare_at_price?: number | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          color_id?: string | null;
          size_option_id?: string | null;
          sku?: string;
          price?: number;
          compare_at_price?: number | null;
          status?: 'active' | 'inactive';
          updated_at?: string;
        };
        Relationships: [];
      };

      product_media: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          storage_path: string;
          media_type: 'image' | 'video';
          mime_type: string | null;
          alt_text: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          storage_path: string;
          media_type?: 'image' | 'video';
          mime_type?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          variant_id?: string | null;
          storage_path?: string;
          media_type?: 'image' | 'video';
          mime_type?: string | null;
          alt_text?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };

      inventory: {
        Row: {
          id: string;
          variant_id: string;
          quantity: number;
          reserved_quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          quantity?: number;
          reserved_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quantity?: number;
          reserved_quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      carts: {
        Row: {
          id: string;
          user_id: string;
          status: 'active' | 'converted' | 'abandoned';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: 'active' | 'converted' | 'abandoned';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'active' | 'converted' | 'abandoned';
          updated_at?: string;
        };
        Relationships: [];
      };

      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          variant_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };

      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          coupon_type: 'general' | 'welcome' | 'welcome_back' | 'one_time';
          discount_type: 'percentage' | 'flat' | 'free_shipping';
          discount_value: number;
          min_order_amount: number;
          max_discount_amount: number | null;
          max_uses: number | null;
          uses_count: number;
          max_uses_per_user: number | null;
          first_order_only: boolean;
          inactive_days_threshold: number | null;
          is_active: boolean;
          valid_from: string | null;
          valid_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          coupon_type?: 'general' | 'welcome' | 'welcome_back' | 'one_time';
          discount_type: 'percentage' | 'flat' | 'free_shipping';
          discount_value: number;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          max_uses?: number | null;
          uses_count?: number;
          max_uses_per_user?: number | null;
          first_order_only?: boolean;
          inactive_days_threshold?: number | null;
          is_active?: boolean;
          valid_from?: string | null;
          valid_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          description?: string | null;
          coupon_type?: 'general' | 'welcome' | 'welcome_back' | 'one_time';
          discount_type?: 'percentage' | 'flat' | 'free_shipping';
          discount_value?: number;
          min_order_amount?: number;
          max_discount_amount?: number | null;
          max_uses?: number | null;
          uses_count?: number;
          max_uses_per_user?: number | null;
          first_order_only?: boolean;
          inactive_days_threshold?: number | null;
          is_active?: boolean;
          valid_from?: string | null;
          valid_to?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      coupon_usages: {
        Row: {
          id: string;
          coupon_id: string;
          user_id: string;
          order_id: string | null;
          used_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          user_id: string;
          order_id?: string | null;
          used_at?: string;
        };
        Update: {
          order_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_coupon_uses: { Args: { coupon_id: string }; Returns: undefined };
      reserve_inventory: { Args: Record<string, unknown>; Returns: unknown };
      decrement_inventory: { Args: { p_variant_id: string; p_qty: number }; Returns: boolean };
      increment_inventory: { Args: { p_variant_id: string; p_qty: number }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
