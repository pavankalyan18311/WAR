-- ============================================================
-- ThreadX — Full Database Schema Migration
-- Paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── ENUMS ──────────────────────────────────────────────────
create type user_role as enum ('customer', 'admin', 'super_admin');
create type product_status as enum ('active', 'draft', 'archived');
create type fit_type as enum ('oversized', 'regular', 'slim', 'relaxed');
create type size_enum as enum ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL');
create type order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type payment_method as enum ('upi', 'card', 'net_banking', 'cod', 'wallet');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type coupon_type as enum ('percentage', 'flat');
create type review_status as enum ('pending', 'approved', 'rejected');
create type loyalty_tier as enum ('bronze', 'silver', 'gold', 'platinum');
create type media_type as enum ('image', 'video');

-- ─── PROFILES ───────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  name         text not null,
  phone        text,
  avatar_url   text,
  role         user_role not null default 'customer',
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CATEGORIES ─────────────────────────────────────────────
create table public.categories (
  id            serial primary key,
  name          text not null,
  slug          text not null unique,
  description   text,
  image_url     text,
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Seed categories
insert into public.categories (name, slug, description, display_order) values
  ('Oversized', 'oversized', 'Boxy, relaxed silhouettes for the streetwear-forward man.', 1),
  ('Classic', 'classic', 'Timeless everyday basics built to last.', 2),
  ('Graphic', 'graphic', 'Bold prints and artistic statements.', 3),
  ('Premium', 'premium', 'Luxe fabrics — Pima cotton, modal blends, and more.', 4),
  ('Vintage', 'vintage', 'Washed-out, retro-inspired styles.', 5);

-- ─── COLLECTIONS ────────────────────────────────────────────
create table public.collections (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  description   text,
  image_url     text,
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── PRODUCTS ───────────────────────────────────────────────
create table public.products (
  id              uuid primary key default uuid_generate_v4(),
  sku             text not null unique,
  name            text not null,
  slug            text not null unique,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  discount_price  numeric(10,2) check (discount_price >= 0),
  category_id     int references public.categories(id) on delete set null,
  collection_id   uuid references public.collections(id) on delete set null,
  status          product_status not null default 'draft',
  fabric          text,
  fit_type        fit_type,
  tags            text[],
  is_featured     boolean not null default false,
  rating          numeric(3,2),
  review_count    int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_products_status on public.products(status);
create index idx_products_category on public.products(category_id);
create index idx_products_slug on public.products(slug);
create index idx_products_featured on public.products(is_featured) where is_featured = true;

-- ─── PRODUCT IMAGES ─────────────────────────────────────────
create table public.product_images (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid not null references public.products(id) on delete cascade,
  url           text not null,
  alt           text,
  type          media_type not null default 'image',
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_product_images_product on public.product_images(product_id);

-- ─── PRODUCT VARIANTS ───────────────────────────────────────
create table public.product_variants (
  id             uuid primary key default uuid_generate_v4(),
  product_id     uuid not null references public.products(id) on delete cascade,
  sku            text not null unique,
  color          text not null,
  color_hex      text,
  size           size_enum not null,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  price_override numeric(10,2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(product_id, color, size)
);

create index idx_variants_product on public.product_variants(product_id);

-- ─── ADDRESSES ──────────────────────────────────────────────
create table public.addresses (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  full_name       text not null,
  phone           text not null,
  address_line_1  text not null,
  address_line_2  text,
  city            text not null,
  state           text not null,
  pincode         text not null,
  country         text not null default 'India',
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_addresses_user on public.addresses(user_id);

-- Ensure only one default address per user
create unique index idx_one_default_address
  on public.addresses (user_id)
  where is_default = true;

-- ─── COUPONS ────────────────────────────────────────────────
create table public.coupons (
  id              uuid primary key default uuid_generate_v4(),
  code            text not null unique,
  type            coupon_type not null,
  value           numeric(10,2) not null check (value > 0),
  min_order       numeric(10,2) not null default 0,
  max_discount    numeric(10,2),
  max_uses        int,
  uses_count      int not null default 0,
  first_time_only boolean not null default false,
  is_active       boolean not null default true,
  valid_from      date not null,
  valid_to        date not null,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Seed default coupons
insert into public.coupons (code, type, value, min_order, first_time_only, valid_from, valid_to, description) values
  ('WELCOME10', 'percentage', 10, 500, true, '2026-01-01', '2026-12-31', 'Welcome discount for new users'),
  ('SUMMER20', 'percentage', 20, 999, false, '2026-06-01', '2026-08-31', 'Summer sale offer');

-- Coupon validation function
create or replace function public.validate_coupon(
  p_code text,
  p_user_id uuid,
  p_order_total numeric
)
returns json language plpgsql security definer
as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric := 0;
  v_order_count int;
begin
  select * into v_coupon from public.coupons where upper(code) = upper(p_code);

  if not found then
    return json_build_object('valid', false, 'discount_amount', 0, 'message', 'Coupon not found');
  end if;

  if not v_coupon.is_active then
    return json_build_object('valid', false, 'discount_amount', 0, 'message', 'Coupon is no longer active');
  end if;

  if current_date < v_coupon.valid_from or current_date > v_coupon.valid_to then
    return json_build_object('valid', false, 'discount_amount', 0, 'message', 'Coupon has expired');
  end if;

  if v_coupon.max_uses is not null and v_coupon.uses_count >= v_coupon.max_uses then
    return json_build_object('valid', false, 'discount_amount', 0, 'message', 'Coupon usage limit reached');
  end if;

  if p_order_total < v_coupon.min_order then
    return json_build_object('valid', false, 'discount_amount', 0,
      'message', 'Minimum order of ₹' || v_coupon.min_order || ' required');
  end if;

  if v_coupon.first_time_only then
    select count(*) into v_order_count from public.orders
    where user_id = p_user_id and status not in ('cancelled', 'refunded');
    if v_order_count > 0 then
      return json_build_object('valid', false, 'discount_amount', 0, 'message', 'Coupon is for first-time orders only');
    end if;
  end if;

  if v_coupon.type = 'percentage' then
    v_discount := (p_order_total * v_coupon.value / 100);
    if v_coupon.max_discount is not null then
      v_discount := least(v_discount, v_coupon.max_discount);
    end if;
  else
    v_discount := v_coupon.value;
  end if;

  v_discount := least(v_discount, p_order_total);

  return json_build_object('valid', true, 'discount_amount', v_discount, 'message', 'Coupon applied successfully');
end;
$$;

-- ─── ORDERS ─────────────────────────────────────────────────
create table public.orders (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id),
  status           order_status not null default 'pending',
  subtotal         numeric(10,2) not null,
  discount         numeric(10,2) not null default 0,
  shipping         numeric(10,2) not null default 0,
  tax              numeric(10,2) not null default 0,
  total            numeric(10,2) not null,
  coupon_code      text,
  payment_method   payment_method not null,
  payment_status   payment_status not null default 'pending',
  shipping_address jsonb not null,
  tracking_number  text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);

-- ─── ORDER ITEMS ────────────────────────────────────────────
create table public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id),
  variant_id  uuid not null references public.product_variants(id),
  quantity    int not null check (quantity > 0),
  unit_price  numeric(10,2) not null,
  total_price numeric(10,2) not null,
  created_at  timestamptz not null default now()
);

create index idx_order_items_order on public.order_items(order_id);

-- ─── WISHLIST ────────────────────────────────────────────────
create table public.wishlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, product_id)
);

create index idx_wishlist_user on public.wishlist(user_id);

-- ─── REVIEWS ─────────────────────────────────────────────────
create table public.reviews (
  id                    uuid primary key default uuid_generate_v4(),
  product_id            uuid not null references public.products(id) on delete cascade,
  user_id               uuid not null references public.profiles(id) on delete cascade,
  rating                int not null check (rating between 1 and 5),
  title                 text,
  body                  text,
  status                review_status not null default 'pending',
  is_verified_purchase  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(product_id, user_id)
);

create index idx_reviews_product on public.reviews(product_id);
create index idx_reviews_status on public.reviews(status);

-- Auto-update product rating when review is approved/updated
create or replace function public.update_product_rating()
returns trigger language plpgsql
as $$
begin
  update public.products
  set
    rating = (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where product_id = coalesce(new.product_id, old.product_id)
        and status = 'approved'
    ),
    review_count = (
      select count(*)
      from public.reviews
      where product_id = coalesce(new.product_id, old.product_id)
        and status = 'approved'
    ),
    updated_at = now()
  where id = coalesce(new.product_id, old.product_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_update_rating
  after insert or update or delete on public.reviews
  for each row execute procedure public.update_product_rating();

-- ─── LOYALTY POINTS ──────────────────────────────────────────
create table public.loyalty_points (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  points      int not null default 0 check (points >= 0),
  tier        loyalty_tier not null default 'bronze',
  updated_at  timestamptz not null default now()
);

-- Auto-create loyalty record on profile creation
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.loyalty_points (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.collections
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.product_variants
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.coupons
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.reviews
  for each row execute procedure public.set_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.loyalty_points enable row level security;

-- Helper: is the current user an admin or super_admin?
create or replace function public.is_admin()
returns boolean language sql security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
  );
$$;

-- PROFILES
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

-- CATEGORIES & PRODUCTS (public read, admin write)
create policy "Anyone can view active categories" on public.categories
  for select using (is_active = true);
create policy "Admins manage categories" on public.categories
  for all using (public.is_admin());

create policy "Anyone can view active products" on public.products
  for select using (status = 'active');
create policy "Admins manage products" on public.products
  for all using (public.is_admin());

create policy "Anyone can view product images" on public.product_images
  for select using (true);
create policy "Admins manage product images" on public.product_images
  for all using (public.is_admin());

create policy "Anyone can view product variants" on public.product_variants
  for select using (true);
create policy "Admins manage variants" on public.product_variants
  for all using (public.is_admin());

create policy "Anyone can view active collections" on public.collections
  for select using (is_active = true);
create policy "Admins manage collections" on public.collections
  for all using (public.is_admin());

-- ADDRESSES
create policy "Users manage own addresses" on public.addresses
  for all using (auth.uid() = user_id);
create policy "Admins can view addresses" on public.addresses
  for select using (public.is_admin());

-- COUPONS (public read for validation, admin write)
create policy "Anyone can read active coupons" on public.coupons
  for select using (is_active = true);
create policy "Admins manage coupons" on public.coupons
  for all using (public.is_admin());

-- ORDERS
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);
create policy "Users can create orders" on public.orders
  for insert with check (auth.uid() = user_id);
create policy "Admins manage all orders" on public.orders
  for all using (public.is_admin());

create policy "Users can view own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );
create policy "Users can insert order items" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );
create policy "Admins manage order items" on public.order_items
  for all using (public.is_admin());

-- WISHLIST
create policy "Users manage own wishlist" on public.wishlist
  for all using (auth.uid() = user_id);

-- REVIEWS
create policy "Anyone can view approved reviews" on public.reviews
  for select using (status = 'approved');
create policy "Users can insert own reviews" on public.reviews
  for insert with check (auth.uid() = user_id);
create policy "Users can update own pending review" on public.reviews
  for update using (auth.uid() = user_id and status = 'pending');
create policy "Admins manage reviews" on public.reviews
  for all using (public.is_admin());

-- LOYALTY
create policy "Users view own loyalty" on public.loyalty_points
  for select using (auth.uid() = user_id);
create policy "Admins manage loyalty" on public.loyalty_points
  for all using (public.is_admin());

-- ─── STORAGE BUCKETS ─────────────────────────────────────────
-- Run these in the Supabase dashboard → Storage OR via API:
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage RLS
-- create policy "Product images are public" on storage.objects for select using (bucket_id = 'product-images');
-- create policy "Admins upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
-- create policy "Admins delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
-- create policy "Avatars are public" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
