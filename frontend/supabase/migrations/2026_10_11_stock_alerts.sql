-- ============================================================================
-- WAR — "Notify me when back in stock" (2026-10-11)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- One row per (size/variant, email). Customers ask from the product page when a
-- size is sold out; when the admin restocks that size, everyone waiting gets one
-- email and notified_at is set. Asking again later re-arms the request.
create table if not exists public.stock_alerts (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  email       text not null check (email = lower(email) and length(email) between 3 and 200),
  user_id     uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  notified_at timestamptz,
  unique (variant_id, email)
);
create index if not exists stock_alerts_pending_idx on public.stock_alerts (variant_id) where notified_at is null;

alter table public.stock_alerts enable row level security;
-- No public policies: requests are created and read only through the server API.

notify pgrst, 'reload schema';
