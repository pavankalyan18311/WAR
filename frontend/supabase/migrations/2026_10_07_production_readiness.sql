-- ============================================================================
-- WAR — production readiness migration (2026-10-07)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- 1. Store settings (single row) — admin-editable shipping rules ------------
create table if not exists public.store_settings (
  id                      smallint primary key default 1 check (id = 1),
  free_shipping_threshold numeric(10,2) not null default 999 check (free_shipping_threshold >= 0),
  shipping_fee            numeric(10,2) not null default 99  check (shipping_fee >= 0),
  cod_enabled             boolean       not null default true,
  updated_at              timestamptz   not null default now()
);
alter table public.store_settings add column if not exists auth_popup jsonb not null default '{}'::jsonb;
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

alter table public.store_settings enable row level security;
drop policy if exists "store_settings readable by everyone" on public.store_settings;
create policy "store_settings readable by everyone" on public.store_settings
  for select using (true);
-- Writes happen only through the server (service role) after an admin check.

-- 2. Product ↔ collection membership ----------------------------------------
create table if not exists public.product_collections (
  product_id    uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);
alter table public.product_collections enable row level security;
drop policy if exists "product_collections readable by everyone" on public.product_collections;
create policy "product_collections readable by everyone" on public.product_collections
  for select using (true);

-- 3. Payments, cancellations & refunds ---------------------------------------
alter table public.orders add column if not exists razorpay_order_id   text;
alter table public.orders add column if not exists razorpay_payment_id text;
create unique index if not exists orders_razorpay_order_id_key
  on public.orders (razorpay_order_id) where razorpay_order_id is not null;

alter table public.order_items add column if not exists status text not null default 'active';
alter table public.order_items drop constraint if exists order_items_status_check;
alter table public.order_items add constraint order_items_status_check
  check (status in ('active', 'cancelled'));

-- 4. Atomic stock changes (prevents selling the same last unit twice) ------
create or replace function public.decrement_inventory(p_variant_id uuid, p_qty integer)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare updated integer;
begin
  update public.inventory
     set quantity = quantity - p_qty, updated_at = now()
   where variant_id = p_variant_id
     and quantity - reserved_quantity >= p_qty;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

create or replace function public.increment_inventory(p_variant_id uuid, p_qty integer)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.inventory
     set quantity = quantity + p_qty, updated_at = now()
   where variant_id = p_variant_id;
end;
$$;

-- 5. Best sellers (product ids ranked by units sold; exposes no order or customer data)
create or replace function public.best_selling_product_ids(p_limit integer default 4)
returns table (product_id uuid, units bigint)
language sql stable security definer set search_path = public
as $$
  select oi.product_id, sum(oi.quantity)::bigint as units
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where o.status in ('confirmed', 'processing', 'shipped', 'delivered')
     and oi.status = 'active'
   group by oi.product_id
   order by units desc
   limit p_limit;
$$;
grant execute on function public.best_selling_product_ids(integer) to anon, authenticated;

-- 6. Contact messages & newsletter (written only by the server; read in Admin → Messages)
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text not null,
  phone       text,
  order_ref   text,
  message     text not null,
  status      text not null default 'new' check (status in ('new', 'handled')),
  created_at  timestamptz not null default now()
);
alter table public.contact_messages enable row level security;

create table if not exists public.newsletter_subscribers (
  email       text primary key,
  created_at  timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

-- Only the server (service role) may change stock.
revoke all on function public.decrement_inventory(uuid, integer) from public, anon, authenticated;
revoke all on function public.increment_inventory(uuid, integer) from public, anon, authenticated;
