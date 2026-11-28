-- ============================================================================
-- WAR — let visitors see active collections (2026-11-28)
-- full_setup.sql switched on row level security for `collections` but never added a read policy,
-- so the Collections pages showed nothing to visitors. Writes stay admin-only (service role).
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.collections enable row level security;

drop policy if exists "Anyone can view active collections" on public.collections;
create policy "Anyone can view active collections" on public.collections
  for select using (is_active);

notify pgrst, 'reload schema';
