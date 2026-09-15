import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { ActivitiesClient, PAGE_SIZE } from "./activities-client";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const [
    { data: activities, count, error: activitiesError },
    { data: organizers, error: organizersError },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(0, PAGE_SIZE - 1),
    // Full list, not paginated — used as dropdown options in the form, not the table.
    supabase.from("organizers").select("*").order("name", { ascending: true }),
  ]);
  if (activitiesError) logError("activities-page-fetch", activitiesError);
  if (organizersError) logError("activities-page-organizers-fetch", organizersError);

  return (
    <ActivitiesClient
      initialActivities={activities ?? []}
      initialCount={count ?? 0}
      organizers={organizers ?? []}
    />
  );
}
