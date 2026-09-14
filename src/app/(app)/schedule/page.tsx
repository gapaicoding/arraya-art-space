import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const supabase = await createClient();
  const today = formatDate(new Date(), "yyyy-MM-dd");

  const [{ data: areas }, { data: activities }, { data: organizers }, { data: businessHours }, { data: schedules }] =
    await Promise.all([
      supabase.from("areas").select("*").order("name", { ascending: true }),
      supabase.from("activities").select("*").eq("status", "active").order("name", { ascending: true }),
      supabase.from("organizers").select("*").eq("status", "active").order("name", { ascending: true }),
      supabase.from("business_hours").select("*"),
      supabase
        .from("schedules")
        .select("*, areas(name, code), activities(name), organizers(name)")
        .eq("date", today)
        .order("start_at", { ascending: true }),
    ]);

  return (
    <ScheduleClient
      initialAreas={areas ?? []}
      activities={activities ?? []}
      organizers={organizers ?? []}
      businessHours={businessHours ?? []}
      initialDate={today}
      initialSchedules={(schedules as any) ?? []}
    />
  );
}
