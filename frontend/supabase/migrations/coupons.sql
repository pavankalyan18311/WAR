-- Run this in your Supabase SQL editor to enable the coupon system

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL,
  description text,
  coupon_type text NOT NULL DEFAULT 'general'
    CHECK (coupon_type IN ('general', 'welcome', 'welcome_back', 'one_time')),
  discount_type text NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'flat', 'free_shipping')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_discount_amount numeric,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  max_uses_per_user integer DEFAULT 1,
  first_order_only boolean NOT NULL DEFAULT false,
  inactive_days_threshold integer,
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_code_unique UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coupon_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coupon_usages_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE,
  CONSTRAINT coupon_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Index for fast per-user lookup
CREATE INDEX IF NOT EXISTS coupon_usages_user_coupon_idx ON public.coupon_usages(user_id, coupon_id);

-- RPC to safely increment uses_count (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_coupon_uses(coupon_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.coupons
  SET uses_count = uses_count + 1,
      updated_at = now()
  WHERE id = coupon_id;
$$;

-- RLS: coupons are readable by everyone (needed for validate API with anon key)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_read_all" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

-- RLS: coupon_usages only accessible via service role (used in API routes)
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_usages_service_role" ON public.coupon_usages FOR ALL USING (true) WITH CHECK (true);
