-- Arayya Art & Space — RBAC 3 Tier: Super Admin (Stage 5.3)
-- Adds a super_admin role above admin/staff. super_admin inherits every
-- admin permission (is_admin() now matches both), plus exclusive access
-- to user management (is_super_admin()).

-- Widen the role CHECK constraint to allow super_admin.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'staff', 'super_admin'));

-- is_admin() now covers super_admin too, so every existing RLS policy that
-- calls is_admin() automatically grants super_admin the same access,
-- without needing to touch each policy individually.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  );
$$;

-- is_super_admin() — strict check for super_admin-only actions
-- (user management: role changes, activation/deactivation).
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;
