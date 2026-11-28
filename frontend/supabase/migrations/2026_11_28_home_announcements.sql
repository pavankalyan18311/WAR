-- ============================================================================
-- WAR — admin-managed announcement bar (the black strip above the header) (2026-11-28)
-- Edited in Admin → Homepage → Announcement bar. {free_shipping} and {return_days} are filled in
-- from the store settings when shown. Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.store_settings add column if not exists home_announcements jsonb not null default
  '{"enabled": true,
    "items": ["Free shipping on orders above {free_shipping}", "{return_days}-day returns & size exchange", "Cash on delivery available"]}'::jsonb;

notify pgrst, 'reload schema';
