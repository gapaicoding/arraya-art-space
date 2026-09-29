-- Arayya Art & Space — Archive Guard for Sales/Expense Transactions
-- The existing update policy (0007) is intentionally permissive for
-- Model A (any authenticated role can edit any transaction's content),
-- but that same permissiveness would let staff archive/restore
-- (deleted_at) too via a direct API call, bypassing the UI-level
-- admin-only gating. RLS's WITH CHECK can't compare NEW vs OLD directly,
-- so this is enforced with a BEFORE UPDATE trigger instead.

create or replace function public.guard_transaction_archive_change()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is distinct from old.deleted_at and not public.is_admin() then
    raise exception 'Hanya admin yang bisa mengarsipkan atau memulihkan transaksi.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_archive_change on public.sales_transactions;
create trigger guard_archive_change before update on public.sales_transactions
  for each row execute procedure public.guard_transaction_archive_change();

drop trigger if exists guard_archive_change on public.expense_transactions;
create trigger guard_archive_change before update on public.expense_transactions
  for each row execute procedure public.guard_transaction_archive_change();
