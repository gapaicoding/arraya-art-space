-- Public agenda page ("/") needs anonymous (unauthenticated) read access
-- to schedules/activities/areas, restricted to non-cancelled, non-internal
-- (not "blocked") rows. bookings intentionally gets no anon policy — it
-- holds customer PII (name, phone) and must stay authenticated-only.

create policy "schedules_select_anon" on public.schedules
  for select to anon using (status != 'cancelled' and type != 'blocked');

create policy "activities_select_anon" on public.activities
  for select to anon using (true);

create policy "areas_select_anon" on public.areas
  for select to anon using (true);
