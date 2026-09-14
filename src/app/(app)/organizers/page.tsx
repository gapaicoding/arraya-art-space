import { createClient } from "@/lib/supabase/server";
import { OrganizersClient } from "./organizers-client";

export default async function OrganizersPage() {
  const supabase = await createClient();
  const { data: organizers } = await supabase
    .from("organizers")
    .select("*")
    .order("name", { ascending: true });

  return <OrganizersClient initialOrganizers={organizers ?? []} />;
}
