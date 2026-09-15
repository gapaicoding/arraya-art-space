import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { ActivitiesClient } from "./activities-client";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const [
    { data: activities, error: activitiesError },
    { data: organizers, error: organizersError },
  ] = await Promise.all([
    supabase.from("activities").select("*").order("name", { ascending: true }),
    supabase.from("organizers").select("*").order("name", { ascending: true }),
  ]);
  if (activitiesError) logError("activities-page-fetch", activitiesError);
  if (organizersError) logError("activities-page-organizers-fetch", organizersError);

  return (
    <ActivitiesClient initialActivities={activities ?? []} organizers={organizers ?? []} />
  );
}
