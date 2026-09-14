import { createClient } from "@/lib/supabase/server";
import { BusinessHoursClient } from "./business-hours-client";

export default async function BusinessHoursPage() {
  const supabase = await createClient();
  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .order("day_of_week", { ascending: true });

  return <BusinessHoursClient initialHours={hours ?? []} />;
}
