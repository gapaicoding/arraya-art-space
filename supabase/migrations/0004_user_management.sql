-- Arayya Art & Space — User Management (Stage 5 improvement)
-- Adds email + is_active to profiles so the in-app User Management page
-- doesn't need extra admin-API round-trips just to list users, and so
-- deactivated users can be filtered/blocked consistently.

alter table public.profiles
  add column if not exists email text,
  add column if not exists is_active boolean not null default true;

-- Backfill email for existing profiles from auth.users.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Keep handle_new_user() copying email into profiles for new signups too.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'staff', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
