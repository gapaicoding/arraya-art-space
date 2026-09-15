import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { OrganizersClient } from "./organizers-client";

export default async function OrganizersPage() {
  const supabase = await createClient();
  const { data: organizers, error } = await supabase
    .from("organizers")
    .select("*")
    .order("name", { ascending: true });
  if (error) logError("organizers-page-fetch", error);

  return <OrganizersClient initialOrganizers={organizers ?? []} />;
}
