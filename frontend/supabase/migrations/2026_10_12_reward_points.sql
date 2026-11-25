-- ============================================================================
-- WAR — reward points (2026-10-12)
-- 1 point = ₹1. Earned when an order is delivered (random: up to 50 below ₹1,000,
-- 50–100 from ₹1,000), valid for 90 days, oldest points used first.
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- Orders fully covered by points are saved with payment method 'points'.
alter type payment_method add value if not exists 'points';

alter table public.orders add column if not exists points_used   integer not null default 0 check (points_used >= 0);
alter table public.orders add column if not exists points_earned integer;

-- Ledger: every earn / redeem / restore is one row.
--  earn    : +points, `remaining` = what is still unspent, `expires_at` = earn time + 90 days
--  redeem  : -points for an order; `lots` records which earn rows it used (so it can be undone)
--  restore : +points given back when an order that used points is cancelled / not paid
create table if not exists public.reward_points (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  kind        text not null check (kind in ('earn', 'redeem', 'restore')),
  points      integer not null,
  remaining   integer not null default 0 check (remaining >= 0),
  expires_at  timestamptz,
  lots        jsonb,
  restored_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists reward_points_user_idx on public.reward_points (user_id, created_at desc);
create index if not exists reward_points_lots_idx on public.reward_points (user_id, expires_at) where kind = 'earn' and remaining > 0;
-- One award per order (Shiprocket may report "delivered" more than once).
create unique index if not exists reward_points_one_earn_per_order on public.reward_points (order_id) where kind = 'earn';

alter table public.reward_points enable row level security;
-- No public policies: read and written only by the server.

-- Spendable balance = unspent, unexpired earned points.
create or replace function public.reward_balance(p_user uuid)
returns integer language sql stable as $$
  select coalesce(sum(remaining), 0)::int
  from public.reward_points
  where user_id = p_user and kind = 'earn' and remaining > 0 and expires_at > now();
$$;

-- Spend points for an order, oldest first. Atomic (rows are locked). Returns false if the balance is too low.
-- Calling it again for the same order is a no-op while that redemption is still active.
create or replace function public.redeem_reward_points(p_user uuid, p_order uuid, p_points integer)
returns boolean language plpgsql as $$
declare
  lot record;
  need integer := p_points;
  take integer;
  used jsonb := '[]'::jsonb;
begin
  if p_points <= 0 then return true; end if;
  if exists (select 1 from public.reward_points where order_id = p_order and kind = 'redeem' and restored_at is null) then
    return true;
  end if;

  for lot in
    select id, remaining from public.reward_points
    where user_id = p_user and kind = 'earn' and remaining > 0 and expires_at > now()
    order by expires_at, created_at
    for update
  loop
    exit when need = 0;
    take := least(lot.remaining, need);
    update public.reward_points set remaining = remaining - take where id = lot.id;
    used := used || jsonb_build_object('id', lot.id, 'points', take);
    need := need - take;
  end loop;

  if need > 0 then
    raise exception 'insufficient_points';  -- rolls back the partial spend above
  end if;

  insert into public.reward_points (user_id, order_id, kind, points, lots)
  values (p_user, p_order, 'redeem', -p_points, used);
  return true;
exception when raise_exception then
  if sqlerrm = 'insufficient_points' then return false; end if;
  raise;
end;
$$;

-- Give back the points an order used (order cancelled or never paid). Returns the points restored.
create or replace function public.restore_reward_points(p_order uuid)
returns integer language plpgsql as $$
declare
  r record;
  lot jsonb;
begin
  select * into r from public.reward_points
  where order_id = p_order and kind = 'redeem' and restored_at is null
  for update;
  if not found then return 0; end if;

  for lot in select * from jsonb_array_elements(r.lots) loop
    update public.reward_points set remaining = remaining + (lot->>'points')::int where id = (lot->>'id')::uuid;
  end loop;
  update public.reward_points set restored_at = now() where id = r.id;
  insert into public.reward_points (user_id, order_id, kind, points) values (r.user_id, p_order, 'restore', -r.points);
  return -r.points;
end;
$$;

notify pgrst, 'reload schema';
