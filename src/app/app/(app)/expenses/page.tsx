import { ExpensesClient } from "./expenses-client";

export default function ExpensesPage() {
  // Preview-only: renders against src/lib/retail-mock-data.ts, not Supabase.
  // See docs/stage-9-retail-financial-operations-plan.md.
  return <ExpensesClient />;
}
