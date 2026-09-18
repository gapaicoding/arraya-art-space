import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { OrganizersClient, PAGE_SIZE } from "./organizers-client";

export default async function OrganizersPage() {
  const supabase = await createClient();
  const { data: organizers, count, error } = await supabase
    .from("organizers")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(0, PAGE_SIZE - 1);
  if (error) logError("organizers-page-fetch", error);

  return <OrganizersClient initialOrganizers={organizers ?? []} initialCount={count ?? 0} />;
}
