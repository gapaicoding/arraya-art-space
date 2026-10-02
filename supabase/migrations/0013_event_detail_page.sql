-- Arayya Art & Space — Halaman Detail Event Publik
-- Links an activity to its priced package (Stage 9 products) for
-- display-only pricing on the public event detail page, and adds a
-- PII-safe aggregate RPC for "kuota tersisa" — anon can't read raw
-- `bookings` rows (customer PII), only a capacity/booked count.

alter table public.activities
  add column product_id uuid references public.products (id) on delete set null;

create or replace function public.get_schedule_availability(p_schedule_id uuid)
returns table(capacity integer, booked integer)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.capacity,
    coalesce(
      (
        select sum(b.participant_count)
        from public.bookings b
        where b.schedule_id = s.id and b.status <> 'cancelled'
      ),
      0
    )::integer
  from public.schedules s
  where s.id = p_schedule_id;
$$;

grant execute on function public.get_schedule_availability(uuid) to anon, authenticated;

-- Product price is shown (display-only) on the public event detail
-- page — anon previously had no select policy on `products` at all
-- (Stage 9 only granted `authenticated`). Table-level GRANT already
-- covers anon via 0003's default privileges; only the RLS policy was
-- missing.
create policy "products_select_anon" on public.products
  for select to anon using (status = 'active');

