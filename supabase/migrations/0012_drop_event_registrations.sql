-- Arayya Art & Space — Revert Stage 8.1 (public event registration)
-- Owner decided the "Daftar" button on the public agenda should go
-- straight to WhatsApp instead of a registration form (see
-- docs/stage-8.1-public-event-registration-plan.md's Status section).
-- Drops what 0010/0011 added; the grant on the table is dropped along
-- with the table itself.

drop table if exists public.event_registrations;
