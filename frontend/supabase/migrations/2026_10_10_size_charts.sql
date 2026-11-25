-- ============================================================================
-- WAR — size charts (2026-10-10)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

-- Admin-editable size charts. One chart can be the store default; a product can
-- point at a specific chart (products.size_chart_id) or use the default (null).
create table if not exists public.size_charts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) between 1 and 60),
  unit        text not null default 'in' check (unit in ('in', 'cm')),
  columns     jsonb not null default '[]'::jsonb,   -- ["Chest", "Length", ...]
  rows        jsonb not null default '[]'::jsonb,   -- [{"size": "M", "values": ["44", "29", ...]}, ...]
  note        text check (note is null or length(note) <= 500),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists size_charts_one_default on public.size_charts (is_default) where is_default;

alter table public.size_charts enable row level security;
drop policy if exists "size_charts readable by everyone" on public.size_charts;
create policy "size_charts readable by everyone" on public.size_charts for select using (true);
-- Writes only through the admin API (service role).

alter table public.products add column if not exists size_chart_id uuid references public.size_charts(id) on delete set null;

-- Starter chart (typical oversized-tee garment measurements).
-- IMPORTANT: replace these numbers with your own garment measurements in Admin → Size Charts.
insert into public.size_charts (name, unit, columns, rows, note, is_default)
select 'Oversized T-Shirt', 'in',
  '["Chest", "Length", "Shoulder", "Sleeve"]'::jsonb,
  '[{"size": "S",   "values": ["42", "28", "21",   "9"]},
    {"size": "M",   "values": ["44", "29", "22",   "9.5"]},
    {"size": "L",   "values": ["46", "30", "23",   "10"]},
    {"size": "XL",  "values": ["48", "31", "24",   "10.5"]},
    {"size": "XXL", "values": ["50", "32", "25",   "11"]}]'::jsonb,
  'Garment measurements, laid flat. Oversized fit — for a regular look, size down.',
  true
where not exists (select 1 from public.size_charts);

notify pgrst, 'reload schema';
