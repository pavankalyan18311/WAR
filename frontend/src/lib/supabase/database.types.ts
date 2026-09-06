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
          created_at?: string;
          updated_at?: string;
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
          id?: string;
          order_id: string;
          product_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: never;
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
      };
    };
  };
}
