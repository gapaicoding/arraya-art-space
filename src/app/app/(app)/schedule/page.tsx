import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { logError } from "@/lib/logger";
import { ScheduleClient } from "./schedule-client";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = await createClient();
  const today = formatDate(new Date(), "yyyy-MM-dd");
  // Support deep-linking / reload-persisting the selected date via ?date=.
  const requestedDate = searchParams?.date;
  const initialDate = requestedDate && DATE_PATTERN.test(requestedDate) ? requestedDate : today;

  const [
    { data: areas, error: areasError },
    { data: activities, error: activitiesError },
    { data: organizers, error: organizersError },
    { data: businessHours, error: businessHoursError },
    { data: schedules, error: schedulesError },
  ] = await Promise.all([
    supabase.from("areas").select("*").order("name", { ascending: true }),
    supabase.from("activities").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("organizers").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("business_hours").select("*"),
    supabase
      .from("schedules")
      .select("*, areas(name, code), activities(name), organizers(name)")
      .eq("date", initialDate)
      .order("start_at", { ascending: true }),
  ]);
  for (const [scope, error] of [
    ["schedule-page-areas", areasError],
    ["schedule-page-activities", activitiesError],
    ["schedule-page-organizers", organizersError],
    ["schedule-page-business-hours", businessHoursError],
    ["schedule-page-schedules", schedulesError],
  ] as const) {
    if (error) logError(scope, error);
  }

  return (
    <ScheduleClient
      initialAreas={areas ?? []}
      activities={activities ?? []}
      organizers={organizers ?? []}
      businessHours={businessHours ?? []}
      initialDate={initialDate}
      initialSchedules={(schedules as any) ?? []}
    />
  );
}
