-- SECURITY: profiles and carts were readable by anyone holding the public (anon) key, which ships to every
-- browser — every customer's email, phone and role could be downloaded. Lock them to "own row only".
-- The server (service role) and admin API are unaffected. Safe to run more than once.

-- 1. profiles --------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Customers may edit their name / phone / avatar, never their role, email or verified flag.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.is_verified is distinct from old.is_verified
       or new.id is distinct from old.id then
      raise exception 'This field cannot be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 2. carts -----------------------------------------------------------------------------------------------
alter table public.carts enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'carts' loop
    execute format('drop policy %I on public.carts', p.policyname);
  end loop;
end $$;

create policy "carts: own" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. cart_items (owned through their cart) -------------------------------------------------------------------
alter table public.cart_items enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'cart_items' loop
    execute format('drop policy %I on public.cart_items', p.policyname);
  end loop;
end $$;

create policy "cart_items: own cart" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- 4. Show every remaining policy so it can be reviewed (paste this result back to Claude) -----------------
select tablename, policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
