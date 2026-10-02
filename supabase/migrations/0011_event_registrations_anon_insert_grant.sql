-- Arayya Art & Space — Fix: anon can't actually INSERT event_registrations
-- The default privileges from 0003_grants.sql only grant `select` to
-- anon (intentionally, for the public agenda page) — insert requires an
-- explicit grant per table. The RLS policy from 0010 alone isn't enough:
-- Postgres checks table-level GRANT before RLS policies ever run.

grant insert on public.event_registrations to anon;
