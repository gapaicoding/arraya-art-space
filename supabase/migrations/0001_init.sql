-- Arayya Art & Space — Activity & Space Management
-- Initial schema migration (Stage 0)
-- Run this in Supabase Dashboard -> SQL Editor if not applied automatically.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ============================================================
-- updated_at helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- is_admin() helper — used across write policies
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'staff')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self_or_admin" on public.profiles
  for insert to authenticated with check (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- organizers
-- ============================================================
create table if not exists public.organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('internal', 'external')),
  pic_name text,
  phone text,
  email text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.organizers enable row level security;

drop trigger if exists set_updated_at on public.organizers;
create trigger set_updated_at before update on public.organizers
  for each row execute procedure public.set_updated_at();

create policy "organizers_select_authenticated" on public.organizers
  for select to authenticated using (true);

create policy "organizers_write_admin" on public.organizers
  for insert to authenticated with check (public.is_admin());
create policy "organizers_update_admin" on public.organizers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "organizers_delete_admin" on public.organizers
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- areas
-- ============================================================
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  capacity integer not null check (capacity > 0),
  location text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.areas enable row level security;

drop trigger if exists set_updated_at on public.areas;
create trigger set_updated_at before update on public.areas
  for each row execute procedure public.set_updated_at();

create policy "areas_select_authenticated" on public.areas
  for select to authenticated using (true);

create policy "areas_write_admin" on public.areas
  for insert to authenticated with check (public.is_admin());
create policy "areas_update_admin" on public.areas
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "areas_delete_admin" on public.areas
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- activities
-- ============================================================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  default_duration_minutes integer not null default 60 check (default_duration_minutes > 0),
  organizer_id uuid references public.organizers (id) on delete set null,
  capacity_recommendation integer,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.activities enable row level security;

drop trigger if exists set_updated_at on public.activities;
create trigger set_updated_at before update on public.activities
  for each row execute procedure public.set_updated_at();

create policy "activities_select_authenticated" on public.activities
  for select to authenticated using (true);

create policy "activities_write_admin" on public.activities
  for insert to authenticated with check (public.is_admin());
create policy "activities_update_admin" on public.activities
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "activities_delete_admin" on public.activities
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- business_hours
-- ============================================================
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.business_hours enable row level security;

drop trigger if exists set_updated_at on public.business_hours;
create trigger set_updated_at before update on public.business_hours
  for each row execute procedure public.set_updated_at();

create policy "business_hours_select_authenticated" on public.business_hours
  for select to authenticated using (true);

create policy "business_hours_write_admin" on public.business_hours
  for insert to authenticated with check (public.is_admin());
create policy "business_hours_update_admin" on public.business_hours
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "business_hours_delete_admin" on public.business_hours
  for delete to authenticated using (public.is_admin());

insert into public.business_hours (day_of_week, is_closed, open_time, close_time)
select d, false, '09:00', '18:00'
from unnest(array[0,1,2,3,4,5,6]) as d
on conflict (day_of_week) do nothing;

-- ============================================================
-- schedules
-- ============================================================
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas (id),
  activity_id uuid references public.activities (id) on delete set null,
  organizer_id uuid references public.organizers (id) on delete set null,
  type text not null check (type in ('internal_activity', 'external_booking', 'blocked')),
  date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity integer,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  constraint end_after_start check (end_at > start_at),
  -- Anti double-booking: no overlapping active schedules on the same area.
  exclude using gist (
    area_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status <> 'cancelled')
);

alter table public.schedules enable row level security;

create index if not exists schedules_area_date_idx on public.schedules (area_id, date);

drop trigger if exists set_updated_at on public.schedules;
create trigger set_updated_at before update on public.schedules
  for each row execute procedure public.set_updated_at();

create policy "schedules_select_authenticated" on public.schedules
  for select to authenticated using (true);

create policy "schedules_insert_authenticated" on public.schedules
  for insert to authenticated with check (true);

create policy "schedules_update_authenticated" on public.schedules
  for update to authenticated using (true) with check (true);

create policy "schedules_delete_admin" on public.schedules
  for delete to authenticated using (public.is_admin());

-- ============================================================
-- bookings
-- ============================================================
create sequence if not exists public.booking_number_seq start 1;

create or replace function public.generate_booking_number()
returns trigger
language plpgsql
as $$
begin
  if new.booking_number is null then
    new.booking_number := 'BK-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad(nextval('public.booking_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique,
  schedule_id uuid not null references public.schedules (id),
  customer_organizer_name text not null,
  contact_person text,
  phone text,
  participant_count integer,
  purpose text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

alter table public.bookings enable row level security;

drop trigger if exists set_booking_number on public.bookings;
create trigger set_booking_number before insert on public.bookings
  for each row execute procedure public.generate_booking_number();

drop trigger if exists set_updated_at on public.bookings;
create trigger set_updated_at before update on public.bookings
  for each row execute procedure public.set_updated_at();

create policy "bookings_select_authenticated" on public.bookings
  for select to authenticated using (true);

create policy "bookings_insert_authenticated" on public.bookings
  for insert to authenticated with check (true);

create policy "bookings_update_authenticated" on public.bookings
  for update to authenticated using (true) with check (true);

create policy "bookings_delete_admin" on public.bookings
  for delete to authenticated using (public.is_admin());
