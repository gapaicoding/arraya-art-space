import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { logError } from "@/lib/logger";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const today = formatDate(new Date(), "yyyy-MM-dd");

  const [
    { data: items, error: itemsError },
    { data: transactions, error: txError },
    { data: lastInputter, error: lastInputterError },
  ] = await Promise.all([
    supabase
      .from("expense_items")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("expense_transactions")
      .select("*, expense_items(name, category, unit)")
      .eq("transaction_date", today)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("expense_transactions")
      .select("inputter_name, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (itemsError) logError("expenses-page-items", itemsError);
  if (txError) logError("expenses-page-transactions", txError);
  if (lastInputterError) logError("expenses-page-last-inputter", lastInputterError);

  return (
    <ExpensesClient
      initialItems={items ?? []}
      initialTransactions={(transactions as any) ?? []}
      initialDate={today}
      lastInputter={lastInputter}
    />
  );
}
