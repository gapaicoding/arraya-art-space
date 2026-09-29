import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { RegistrationsClient } from "./registrations-client";

export default async function RegistrationsPage() {
  const supabase = await createClient();
  const { data: registrations, error } = await supabase
    .from("event_registrations")
    .select("*, schedules(date, start_at, end_at, activities(name))")
    .order("created_at", { ascending: false });
  if (error) logError("registrations-page-fetch", error);

  return <RegistrationsClient initialRegistrations={(registrations as any) ?? []} />;
}
