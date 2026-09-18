import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { BusinessHoursClient } from "./business-hours-client";

export default async function BusinessHoursPage() {
  const supabase = await createClient();
  const { data: hours, error } = await supabase
    .from("business_hours")
    .select("*")
    .order("day_of_week", { ascending: true });
  if (error) logError("business-hours-page-fetch", error);

  return <BusinessHoursClient initialHours={hours ?? []} />;
}
