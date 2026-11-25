-- ============================================================================
-- WAR — admin-managed homepage content (2026-10-14)
--  • scrolling banner (text, background, text and accent colours)
--  • Instagram profile link + reels shown on the homepage
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

alter table public.store_settings add column if not exists home_marquee jsonb not null default
  '{"enabled": true,
    "items": ["Without Any Regrets", "Oversized", "Heavyweight", "Drop 01", "Made to be lived in"],
    "background": "#161412", "text_color": "#F5F2EC", "accent_color": "#F36E21"}'::jsonb;

alter table public.store_settings add column if not exists instagram_url text;

-- Reels shown on the homepage (short muted videos that link to Instagram).
create table if not exists public.home_reels (
  id          uuid primary key default gen_random_uuid(),
  video_url   text not null,
  poster_url  text,
  link_url    text,
  caption     text check (caption is null or length(caption) <= 120),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists home_reels_order_idx on public.home_reels (is_active, sort_order, created_at);

alter table public.home_reels enable row level security;
drop policy if exists "active reels readable by everyone" on public.home_reels;
create policy "active reels readable by everyone" on public.home_reels for select using (is_active);
-- Writes only through the admin API (service role).

-- Public bucket for homepage media (reel videos up to 50 MB, posters).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';
