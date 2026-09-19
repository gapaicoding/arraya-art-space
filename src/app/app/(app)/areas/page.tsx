import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { AreasClient, PAGE_SIZE } from "./areas-client";

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: areas, count, error } = await supabase
    .from("areas")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    // See organizers/page.tsx for why .range() is avoided here.
    .limit(PAGE_SIZE);
  if (error) logError("areas-page-fetch", error);

  return <AreasClient initialAreas={areas ?? []} initialCount={count ?? 0} />;
}
