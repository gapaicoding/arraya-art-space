-- Arayya Art & Space — Registrasi Publik untuk Event (Stage 8.1)
-- Public leads, not real bookings: anonymous visitors have no profiles
-- row for bookings.created_by to reference, and staff should approve
-- capacity-affecting registrations manually. See
-- docs/stage-8.1-public-event-registration-plan.md.

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id),
  customer_name text not null check (btrim(customer_name) <> ''),
  phone text not null check (btrim(phone) <> ''),
  participant_count integer not null check (participant_count > 0),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

alter table public.event_registrations enable row level security;

-- Anyone (anon visitor filling the public form, or a staff member who
-- happens to be logged in) can submit a registration.
create policy "event_registrations_insert_public" on public.event_registrations
  for insert to anon, authenticated with check (true);

-- Only admin+ can see or act on the list of leads — the public visitor
-- who submitted can't read back other people's registrations.
create policy "event_registrations_select_admin" on public.event_registrations
  for select to authenticated using (public.is_admin());

create policy "event_registrations_update_admin" on public.event_registrations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
