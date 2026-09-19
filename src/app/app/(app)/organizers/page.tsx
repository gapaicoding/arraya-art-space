import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { OrganizersClient, PAGE_SIZE } from "./organizers-client";

export default async function OrganizersPage() {
  const supabase = await createClient();
  const { data: organizers, count, error } = await supabase
    .from("organizers")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    // .range(0, PAGE_SIZE - 1) triggers a Next.js SSR bug where the
    // offset=0 query param it adds causes Supabase to return an empty
    // data array while the count header still comes back correct —
    // reproduced consistently in dev and prod, isolated to Next's
    // Server Component fetch handling (a plain script using the same
    // supabase-js client and the same request works fine). .limit()
    // alone (no offset param) sidesteps it and is equivalent for this
    // always-page-1 initial load; real pagination (page > 1) happens
    // client-side via the browser Supabase client, which isn't affected.
    .limit(PAGE_SIZE);
  if (error) logError("organizers-page-fetch", error);

  return <OrganizersClient initialOrganizers={organizers ?? []} initialCount={count ?? 0} />;
}
