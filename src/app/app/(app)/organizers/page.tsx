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

  return (
    <>
      {/* TEMP DEBUG — remove after diagnosing prod empty-list bug */}
      <div
        data-debug-marker
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          background: "yellow",
          color: "black",
          fontSize: 10,
          padding: 4,
        }}
      >
        DEBUG rows={JSON.stringify(organizers?.length ?? null)} count=
        {JSON.stringify(count)} err={JSON.stringify(error?.message ?? null)}
      </div>
      <OrganizersClient initialOrganizers={organizers ?? []} initialCount={count ?? 0} />
    </>
  );
}
