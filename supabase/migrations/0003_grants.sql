-- Fix: tables created via SQL Editor do not automatically receive the
-- standard Supabase role grants (anon/authenticated/service_role).
-- RLS policies from 0001_init.sql still govern row-level access; these
-- grants only give the roles table-level permission to attempt queries.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- Ensure future tables/sequences/functions in public also get these grants
-- automatically, so this doesn't need to be repeated for later migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
