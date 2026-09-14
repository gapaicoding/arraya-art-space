import { createClient } from "@/lib/supabase/server";
import { ActivitiesClient } from "./activities-client";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const [{ data: activities }, { data: organizers }] = await Promise.all([
    supabase.from("activities").select("*").order("name", { ascending: true }),
    supabase.from("organizers").select("*").order("name", { ascending: true }),
  ]);

  return (
    <ActivitiesClient initialActivities={activities ?? []} organizers={organizers ?? []} />
  );
}
