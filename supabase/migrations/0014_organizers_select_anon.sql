-- Arayya Art & Space — anon needs to read organizers for the public
-- event detail page ("Diselenggarakan oleh"). Only non-PII columns are
-- exposed via this table anyway (name/type/phone — phone here is the
-- organizer's own public contact, not a customer's).

create policy "organizers_select_anon" on public.organizers
  for select to anon using (true);
