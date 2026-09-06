-- ============================================================
-- ThreadX — Complete Database Schema & Seed Setup
-- Paste this ENTIRE file into Supabase → SQL Editor → Click Run
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMS (Safe creation)
do $$ begin
  create type user_role as enum ('customer', 'admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('active', 'draft', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fit_type as enum ('oversized', 'regular', 'slim', 'relaxed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type size_enum as enum ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('upi', 'card', 'net_banking', 'cod', 'wallet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coupon_type as enum ('percentage', 'flat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type loyalty_tier as enum ('bronze', 'silver', 'gold', 'platinum');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

-- 3. PROFILES TABLE
create table if not exists public.profiles (
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

-- Auto-create profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. CATEGORIES TABLE
create table if not exists public.categories (
  id            serial primary key,
  name          text not null,
  slug          text not null unique,
  description   text,
  image_url     text,
  display_order int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 5. COLLECTIONS TABLE
create table if not exists public.collections (
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

-- 6. PRODUCTS TABLE
create table if not exists public.products (
  id              uuid primary key default uuid_generate_v4(),
  sku             text not null unique,
  name            text not null,
  slug            text not null unique,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  discount_price  numeric(10,2) check (discount_price >= 0),
  category_id     int references public.categories(id) on delete set null,
  collection_id   uuid references public.collections(id) on delete set null,
  status          product_status not null default 'active',
  fabric          text,
  fit_type        fit_type,
  tags            text[],
  is_featured     boolean not null default false,
  rating          numeric(3,2),
  review_count    int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_slug on public.products(slug);

-- 7. PRODUCT IMAGES TABLE
create table if not exists public.product_images (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid not null references public.products(id) on delete cascade,
  url           text not null,
  alt           text,
  type          media_type not null default 'image',
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

-- 8. PRODUCT VARIANTS TABLE
create table if not exists public.product_variants (
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

-- 9. ADDRESSES TABLE
create table if not exists public.addresses (
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

-- 10. ORDERS & ORDER ITEMS TABLES
create table if not exists public.orders (
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

create table if not exists public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id),
  variant_id  uuid not null references public.product_variants(id),
  quantity    int not null check (quantity > 0),
  unit_price  numeric(10,2) not null,
  total_price numeric(10,2) not null,
  created_at  timestamptz not null default now()
);

-- 11. WISHLIST TABLE
create table if not exists public.wishlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(user_id, product_id)
);

-- 12. RLS POLICIES
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist enable row level security;

-- Permissive public policies for store browsing
drop policy if exists "Anyone can view active categories" on public.categories;
create policy "Anyone can view active categories" on public.categories for select using (true);

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products for select using (true);

drop policy if exists "Anyone can view product images" on public.product_images;
create policy "Anyone can view product images" on public.product_images for select using (true);

drop policy if exists "Anyone can view product variants" on public.product_variants;
create policy "Anyone can view product variants" on public.product_variants for select using (true);

-- 13. SEED CATEGORIES
INSERT INTO public.categories (id, name, slug, description, display_order, is_active) VALUES
  (1, 'Men', 'men', 'Premium menswear featuring streetwear, casuals, and oversized fits.', 1, true),
  (2, 'Women', 'women', 'Contemporary women fashion & elevated aesthetic wardrobe staples.', 2, true),
  (3, 'Unisex', 'unisex', 'Versatile gender-neutral designs and signature drop-shoulder tees.', 3, true),
  (4, 'Kids', 'kids', 'Comfortable, durable, and stylish clothing for kids.', 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 14. SEED PRODUCTS
INSERT INTO public.products (
  id, sku, name, slug, description, price, discount_price, category_id, status, fabric, fit_type, tags, is_featured, rating, review_count
) VALUES
  (
    'a1b2c3d4-0001-4000-8000-000000000001',
    'TX-TSH-001',
    'Heavyweight Heavy-Cotton Oversized Tee',
    'heavyweight-oversized-tee-black',
    'Crafted from 280 GSM 100% combed organic cotton. Features drop-shoulder design, ribbed collar, and reinforced double-needle stitching. Pre-shrunk for lasting shape.',
    1499.00,
    899.00,
    1,
    'active',
    '280 GSM Organic Cotton',
    'oversized',
    ARRAY['oversized', 'streetwear', 'best-seller', 'topwear'],
    true,
    4.7,
    142
  ),
  (
    'a1b2c3d4-0002-4000-8000-000000000002',
    'TX-TSH-002',
    'Acid Wash Vintage Drop-Shoulder Shirt',
    'acid-wash-vintage-drop-shoulder',
    'Artisanal hand-dyed acid wash texture giving every piece a unique vintage patina. Ultra-breathable, soft-hand feel with relaxed casual fit.',
    1999.00,
    1199.00,
    1,
    'active',
    '100% French Terry Cotton',
    'relaxed',
    ARRAY['vintage', 'acid-wash', 'trending'],
    true,
    4.8,
    98
  ),
  (
    'a1b2c3d4-0003-4000-8000-000000000003',
    'TX-SHI-003',
    'Resort Linen-Blend Cuban Collar Shirt',
    'resort-linen-cuban-collar-shirt',
    'Breezy, lightweight linen-cotton blend with breathable weave. Relaxed open Cuban collar design ideal for summer resortwear and weekend outings.',
    2499.00,
    1499.00,
    1,
    'active',
    'Linen Cotton Blend',
    'regular',
    ARRAY['linen', 'summer', 'cuban-collar', 'shirts'],
    true,
    4.6,
    76
  ),
  (
    'a1b2c3d4-0004-4000-8000-000000000004',
    'TX-JNS-004',
    'Wide Leg Baggy Raw Denim Jeans',
    'wide-leg-baggy-raw-denim-jeans',
    'Classic 14oz non-stretch Japanese selvedge-inspired raw denim. Wide-leg silhouette with deep utility pockets and branded metal button closure.',
    3499.00,
    2099.00,
    1,
    'active',
    '14oz Heavyweight Denim',
    'relaxed',
    ARRAY['denim', 'baggy', 'bottomwear'],
    true,
    4.9,
    215
  ),
  (
    'a1b2c3d4-0005-4000-8000-000000000005',
    'TX-HD-005',
    'Minimalist Fleece Heavyweight Hoodie',
    'minimalist-fleece-heavyweight-hoodie',
    '400 GSM brushed fleece lining delivering maximum warmth and plush comfort. Double-lined hood, seamless kangaroo pocket, and ribbed cuffs.',
    3999.00,
    2399.00,
    3,
    'active',
    '400 GSM Fleece Cotton',
    'oversized',
    ARRAY['hoodie', 'winterwear', 'fleece', 'unisex'],
    true,
    4.8,
    184
  ),
  (
    'a1b2c3d4-0006-4000-8000-000000000006',
    'TX-W-DRS-006',
    'Ribbed Knit Bodycon Midi Dress',
    'ribbed-knit-bodycon-midi-dress',
    'Form-fitting ribbed stretch knit dress featuring a clean crew neckline and side slit for effortless chic elegance.',
    2799.00,
    1679.00,
    2,
    'active',
    'Viscose Modal Rib Knit',
    'slim',
    ARRAY['dress', 'women', 'knitwear'],
    false,
    4.5,
    63
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  discount_price = EXCLUDED.discount_price,
  description = EXCLUDED.description,
  fabric = EXCLUDED.fabric,
  fit_type = EXCLUDED.fit_type,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count;

-- 15. SEED PRODUCT IMAGES
DELETE FROM public.product_images WHERE product_id IN (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'a1b2c3d4-0004-4000-8000-000000000004',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'a1b2c3d4-0006-4000-8000-000000000006'
);

INSERT INTO public.product_images (product_id, url, alt, display_order) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000&auto=format&fit=crop', 'Heavyweight Black Oversized Tee Front', 1),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1000&auto=format&fit=crop', 'Heavyweight Black Oversized Tee Back', 2),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1000&auto=format&fit=crop', 'Acid Wash Vintage Tee', 1),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1000&auto=format&fit=crop', 'Linen Cuban Collar Shirt', 1),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1000&auto=format&fit=crop', 'Wide Leg Baggy Denim', 1),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop', 'Minimalist Fleece Hoodie', 1),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop', 'Ribbed Knit Midi Dress', 1);

-- 16. SEED PRODUCT VARIANTS
DELETE FROM public.product_variants WHERE product_id IN (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000002',
  'a1b2c3d4-0003-4000-8000-000000000003',
  'a1b2c3d4-0004-4000-8000-000000000004',
  'a1b2c3d4-0005-4000-8000-000000000005',
  'a1b2c3d4-0006-4000-8000-000000000006'
);

INSERT INTO public.product_variants (product_id, sku, color, color_hex, size, stock_quantity) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-S', 'Pitch Black', '#0D0D0D', 'S', 25),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-M', 'Pitch Black', '#0D0D0D', 'M', 40),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-L', 'Pitch Black', '#0D0D0D', 'L', 35),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'TX-TSH-001-BLK-XL', 'Pitch Black', '#0D0D0D', 'XL', 15),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'TX-TSH-002-WSH-M', 'Washed Charcoal', '#333333', 'M', 30),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'TX-TSH-002-WSH-L', 'Washed Charcoal', '#333333', 'L', 20),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'TX-SHI-003-SND-M', 'Desert Sand', '#D2B48C', 'M', 20),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'TX-SHI-003-SND-L', 'Desert Sand', '#D2B48C', 'L', 25),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'TX-JNS-004-IND-30', 'Raw Indigo', '#1A2B4C', 'M', 18),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'TX-JNS-004-IND-32', 'Raw Indigo', '#1A2B4C', 'L', 22),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'TX-HD-005-GRY-M', 'Heather Grey', '#808080', 'M', 30),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'TX-HD-005-GRY-L', 'Heather Grey', '#808080', 'L', 25);
