-- ============================================================================
-- WAR — return / size-exchange window, editable in Admin → Settings (2026-11-28)
-- Shown on product pages, cart, checkout, FAQ, refund policy, terms, order emails and
-- the announcement bar ({return_days}). Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.store_settings add column if not exists return_days integer not null default 7;

alter table public.store_settings drop constraint if exists store_settings_return_days_range;
alter table public.store_settings add constraint store_settings_return_days_range check (return_days between 1 and 60);

notify pgrst, 'reload schema';
