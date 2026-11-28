-- SECURITY: with only the public (anon) key — which every browser has — anyone could change product prices,
-- create products, upload files to the "products" bucket and burn coupon uses (found by
-- src/__tests__/integration/attackerAccess.integration.test.ts).
--
-- Rule from now on: the browser may only WRITE its own profile (name / phone / avatar) and its own cart.
-- Everything else is written by the server with the service role key (admin API, checkout), which is unaffected.
-- Reading stays exactly as it is (catalogue public; private data own-row only). Safe to run more than once.

-- 1. Table privileges: take away insert / update / delete from the public roles on EVERY table --------------
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ...and give back only what the website really does from the browser:
grant update (name, phone, avatar_url, updated_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;

-- Tables created later start locked too.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;

-- 2. Server-only database functions: only the service role may call them ---------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('increment_coupon_uses', 'increment_inventory', 'reserve_inventory', 'decrement_inventory',
                        'redeem_reward_points', 'restore_reward_points', 'reward_balance')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- 3. Storage: nobody may upload / replace / delete files with the public key ------------------------------
-- Admin uploads go through the server (service role) or a one-time signed upload link, which don't need these.
-- Viewing images stays public (the buckets are public).
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 4. Show what is left so it can be reviewed --------------------------------------------------------------
select 'table grant' as kind, table_name as name, grantee || ': ' || string_agg(privilege_type, ', ' order by privilege_type) as detail
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT'
group by table_name, grantee
union all
select 'storage policy', policyname, cmd || ' ' || roles::text from pg_policies where schemaname = 'storage' and tablename = 'objects'
order by 1, 2;
