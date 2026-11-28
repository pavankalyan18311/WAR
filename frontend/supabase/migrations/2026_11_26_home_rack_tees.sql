-- ============================================================================
-- WAR — homepage rack hero tees, managed in Admin → Homepage → Rack tees (2026-11-26)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- Photos are uploaded to the existing public "products" bucket.
-- ============================================================================

create table if not exists public.home_rack_tees (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) between 1 and 40),
  price        numeric(10, 2) not null check (price > 0),
  front_url    text not null,
  back_url     text,
  link_url     text,          -- a page on this site, e.g. /products/three-sword-jersey; null = /products
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  is_featured  boolean not null default false,   -- faces forward first when the page opens
  created_at   timestamptz not null default now()
);
create index if not exists home_rack_tees_order_idx on public.home_rack_tees (is_active, sort_order, created_at);

-- At most one tee faces forward first.
create unique index if not exists home_rack_tees_one_featured on public.home_rack_tees (is_featured) where is_featured;

alter table public.home_rack_tees enable row level security;
drop policy if exists "active rack tees readable by everyone" on public.home_rack_tees;
create policy "active rack tees readable by everyone" on public.home_rack_tees for select using (is_active);
-- Writes only through the admin API (service role).

-- Start with the five tees the homepage already shows (only if the table is empty).
insert into public.home_rack_tees (name, price, front_url, back_url, sort_order, is_featured)
select * from (values
  ('Ashen Halo Tee',     1499.00, '/images/rack/ashen-halo-front.jpg',     '/images/rack/ashen-halo-back.jpg',     1, false),
  ('Grid Runner Tee',    1599.00, '/images/rack/grid-runner-front.jpg',    '/images/rack/grid-runner-back.jpg',    2, false),
  ('Three Sword Jersey', 1799.00, '/images/rack/zoro-green-front.jpg',     '/images/rack/zoro-green-back.jpg',     3, true),
  ('Ember Patch Tee',    1499.00, '/images/rack/ember-patch-front.jpg',    '/images/rack/ember-patch-back.jpg',    4, false),
  ('Thunder Stripe Tee', 1699.00, '/images/rack/thunder-stripe-front.jpg', '/images/rack/thunder-stripe-back.jpg', 5, false)
) as seed(name, price, front_url, back_url, sort_order, is_featured)
where not exists (select 1 from public.home_rack_tees);

notify pgrst, 'reload schema';
