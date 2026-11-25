-- ============================================================================
-- WAR — fixes & admin options (2026-10-08)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- 1. Link order items to products/variants --------------------------------
-- Needed so My Orders, Track Order, Admin → Orders and Shiprocket booking can
-- read item names, sizes and colours. Also stops products that appear in past
-- orders from being deleted by accident (archive them instead).
alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id);

alter table public.order_items drop constraint if exists order_items_variant_id_fkey;
alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- 2. SECURITY: coupons must only be changed by the server (admin API) --------
-- The old policies allowed ANYONE to create/edit/delete coupons and read usage.
drop policy if exists "coupons_admin_all" on public.coupons;
drop policy if exists "coupons_read_all" on public.coupons;
drop policy if exists "coupon_usages_service_role" on public.coupon_usages;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;
-- (No public policies: coupon checks and usage tracking run on the server.)

-- 3. Admin-managed dropdown options for products (fabric, fit, …) -----------
create table if not exists public.product_attribute_options (
  id          uuid primary key default gen_random_uuid(),
  attribute   text not null check (attribute in ('fabric', 'fit', 'pattern', 'sleeve_type', 'neck_type', 'gender')),
  value       text not null check (length(trim(value)) between 1 and 60),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (attribute, value)
);
alter table public.product_attribute_options enable row level security;
drop policy if exists "product_attribute_options readable by everyone" on public.product_attribute_options;
create policy "product_attribute_options readable by everyone" on public.product_attribute_options
  for select using (true);

insert into public.product_attribute_options (attribute, value, sort_order) values
  ('fabric', '100% Cotton', 1), ('fabric', 'Cotton Blend', 2), ('fabric', 'Organic Cotton', 3),
  ('fabric', 'French Terry', 4), ('fabric', 'Polyester', 5), ('fabric', 'Linen', 6),
  ('fit', 'Oversized', 1), ('fit', 'Regular', 2), ('fit', 'Relaxed', 3), ('fit', 'Slim', 4), ('fit', 'Boxy', 5),
  ('pattern', 'Solid', 1), ('pattern', 'Graphic Print', 2), ('pattern', 'Typography', 3),
  ('pattern', 'Striped', 4), ('pattern', 'Embroidered', 5), ('pattern', 'Tie-Dye', 6),
  ('sleeve_type', 'Half Sleeve', 1), ('sleeve_type', 'Full Sleeve', 2), ('sleeve_type', 'Drop Shoulder', 3), ('sleeve_type', 'Sleeveless', 4),
  ('neck_type', 'Round Neck', 1), ('neck_type', 'V-Neck', 2), ('neck_type', 'Polo Collar', 3), ('neck_type', 'Henley', 4), ('neck_type', 'Hooded', 5),
  ('gender', 'Men', 1), ('gender', 'Women', 2), ('gender', 'Unisex', 3)
on conflict (attribute, value) do nothing;

-- Ask the API to pick up the new tables/relationships immediately.
notify pgrst, 'reload schema';
