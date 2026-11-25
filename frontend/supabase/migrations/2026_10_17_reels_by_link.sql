-- Homepage reels can now be added by Instagram link only (no uploaded video).
-- A reel needs a video OR a link. Safe to run more than once.

alter table public.home_reels alter column video_url drop not null;

alter table public.home_reels drop constraint if exists home_reels_video_or_link;
alter table public.home_reels
  add constraint home_reels_video_or_link check (video_url is not null or link_url is not null);
