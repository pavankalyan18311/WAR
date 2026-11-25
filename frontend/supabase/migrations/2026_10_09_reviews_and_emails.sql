-- ============================================================================
-- WAR — product reviews + order email log (2026-10-09)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- 1. Product reviews ----------------------------------------------------------
-- Only customers whose order was delivered can review (checked by the server).
-- New and edited reviews wait for admin approval before they appear on the site.
create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  rating      smallint not null check (rating between 1 and 5),
  title       text check (title is null or length(title) <= 80),
  body        text not null check (length(trim(body)) between 10 and 1500),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists product_reviews_product_status_idx on public.product_reviews (product_id, status);
create index if not exists product_reviews_status_idx on public.product_reviews (status, created_at desc);

alter table public.product_reviews enable row level security;
-- No public policies: reviews are read and written only through the server API.

-- 2. Order email log -----------------------------------------------------------
-- One row per email sent, so a repeated Shiprocket webhook never emails twice.
create table if not exists public.email_log (
  key         text primary key,
  order_id    uuid references public.orders(id) on delete cascade,
  kind        text not null,
  created_at  timestamptz not null default now()
);
alter table public.email_log enable row level security;

-- 3. Clear stale stock reservations ------------------------------------------
-- Left over from the old checkout (the current one takes stock directly and never
-- reserves). They hid stock in the shop (e.g. 8 in stock, 8 reserved → "Sold out")
-- and made Admin → Edit product fail with a 500 when lowering stock.
update public.inventory set reserved_quantity = 0 where reserved_quantity <> 0;

notify pgrst, 'reload schema';
