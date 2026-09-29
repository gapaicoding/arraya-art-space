import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { ExpenseItemsClient } from "./expense-items-client";

export default async function ExpenseItemsPage() {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("expense_items")
    .select("*")
    .order("name", { ascending: true });
  if (error) logError("expense-items-page-fetch", error);

  return <ExpenseItemsClient initialItems={items ?? []} />;
}
