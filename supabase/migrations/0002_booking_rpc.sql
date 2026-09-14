-- Arayya Art & Space — Activity & Space Management
-- Stage 4 (Booking): atomic booking creation & cancellation RPCs.
-- Run this in Supabase Dashboard -> SQL Editor after 0001_init.sql.

-- ============================================================
-- create_booking: inserts a schedule (type = external_booking) and a
-- linked booking row atomically. Relies on the schedules exclusion
-- constraint for anti-double-booking (PRD 8.1) and validates capacity
-- against the area (PRD 7.10).
-- ============================================================
create or replace function public.create_booking(
  p_area_id uuid,
  p_date date,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_customer_organizer_name text,
  p_contact_person text,
  p_phone text,
  p_participant_count integer,
  p_purpose text,
  p_notes text,
  p_organizer_id uuid default null,
  p_activity_id uuid default null
)
returns public.bookings
language plpgsql
security invoker
as $$
declare
  v_area public.areas;
  v_schedule_id uuid;
  v_booking public.bookings;
begin
  if p_end_at <= p_start_at then
    raise exception 'Waktu selesai harus setelah waktu mulai.';
  end if;

  select * into v_area from public.areas where id = p_area_id;
  if v_area.id is null then
    raise exception 'Area tidak ditemukan.';
  end if;
  if v_area.status <> 'active' then
    raise exception 'Area tidak aktif dan tidak dapat menerima booking baru.';
  end if;

  if p_participant_count is not null and p_participant_count > v_area.capacity then
    raise exception 'Jumlah peserta (%) melebihi kapasitas area (%).', p_participant_count, v_area.capacity;
  end if;

  insert into public.schedules (
    area_id, activity_id, organizer_id, type, date, start_at, end_at, capacity, notes, status, created_by, updated_by
  ) values (
    p_area_id, p_activity_id, p_organizer_id, 'external_booking', p_date, p_start_at, p_end_at,
    p_participant_count, p_notes, 'confirmed', auth.uid(), auth.uid()
  )
  returning id into v_schedule_id;

  insert into public.bookings (
    schedule_id, customer_organizer_name, contact_person, phone, participant_count, purpose, notes, status, created_by, updated_by
  ) values (
    v_schedule_id, p_customer_organizer_name, p_contact_person, p_phone, p_participant_count, p_purpose, p_notes, 'pending', auth.uid(), auth.uid()
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.create_booking(
  uuid, date, timestamptz, timestamptz, text, text, text, integer, text, text, uuid, uuid
) to authenticated;

-- ============================================================
-- cancel_booking: cancels a booking and its linked schedule together,
-- freeing area availability (PRD 7.7 / 7.10).
-- ============================================================
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security invoker
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking.id is null then
    raise exception 'Booking tidak ditemukan.';
  end if;

  update public.schedules
    set status = 'cancelled', updated_by = auth.uid()
    where id = v_booking.schedule_id;

  update public.bookings
    set status = 'cancelled', updated_by = auth.uid()
    where id = p_booking_id
    returning * into v_booking;

  return v_booking;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
