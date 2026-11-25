-- ============================================================================
-- WAR — reward points hardening (2026-10-12b)
-- The points functions should only ever be called by the server (service role).
-- They were already safe (they run with the caller's rights and the table has no
-- public access), but this removes public access to them entirely.
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

revoke execute on function public.reward_balance(uuid) from public, anon, authenticated;
revoke execute on function public.redeem_reward_points(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.restore_reward_points(uuid) from public, anon, authenticated;

grant execute on function public.reward_balance(uuid) to service_role;
grant execute on function public.redeem_reward_points(uuid, uuid, integer) to service_role;
grant execute on function public.restore_reward_points(uuid) to service_role;

notify pgrst, 'reload schema';
