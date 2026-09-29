-- Arayya Art & Space — Nama Penginput (Stage 9 follow-up)
-- Adds inputter_name to sales_transactions and expense_transactions so
-- recap tables show who physically entered the data, independent of
-- which Supabase Auth account is logged in (staff can share a device
-- across a shift). Mirrors lovinmilk's "penginput" concept, kept simple
-- here as a free-text field remembered client-side per device/session.

alter table public.sales_transactions add column if not exists inputter_name text;
update public.sales_transactions set inputter_name = 'Tidak diketahui' where inputter_name is null;
alter table public.sales_transactions alter column inputter_name set not null;

alter table public.expense_transactions add column if not exists inputter_name text;
update public.expense_transactions set inputter_name = 'Tidak diketahui' where inputter_name is null;
alter table public.expense_transactions alter column inputter_name set not null;
