import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { logError } from "@/lib/logger";
import { SalesClient } from "./sales-client";

export default async function SalesPage() {
  const supabase = await createClient();
  const today = formatDate(new Date(), "yyyy-MM-dd");

  const [
    { data: products, error: productsError },
    { data: transactions, error: txError },
    { data: lastInputter, error: lastInputterError },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase
      .from("sales_transactions")
      .select("*, products(name, category)")
      .eq("transaction_date", today)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_transactions")
      .select("inputter_name, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (productsError) logError("sales-page-products", productsError);
  if (txError) logError("sales-page-transactions", txError);
  if (lastInputterError) logError("sales-page-last-inputter", lastInputterError);

  return (
    <SalesClient
      initialProducts={products ?? []}
      initialTransactions={(transactions as any) ?? []}
      initialDate={today}
      lastInputter={lastInputter}
    />
  );
}
