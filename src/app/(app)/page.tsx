import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { logError } from "@/lib/logger";
import { computeScheduleConflicts } from "@/lib/conflicts";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = formatDate(new Date(), "yyyy-MM-dd");

  const [
    { count: areaCount, error: areaCountError },
    { count: activeAreaCount, error: activeAreaCountError },
    { data: todaySchedules, error: todaySchedulesError },
    { data: todayBookings, error: todayBookingsError },
    { data: upcomingSchedules, error: upcomingSchedulesError },
  ] = await Promise.all([
    supabase.from("areas").select("*", { count: "exact", head: true }),
    supabase.from("areas").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("schedules")
      .select("*, areas(name, code), activities(name), organizers(name)")
      .eq("date", today)
      .neq("status", "cancelled")
      .order("start_at", { ascending: true }),
    supabase.from("bookings").select("*, schedules(date)").neq("status", "cancelled"),
    supabase
      .from("schedules")
      .select("*, areas(name, code), activities(name), organizers(name)")
      .gt("date", today)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("start_at", { ascending: true })
      .limit(5),
  ]);
  for (const [scope, error] of [
    ["dashboard-area-count", areaCountError],
    ["dashboard-active-area-count", activeAreaCountError],
    ["dashboard-today-schedules", todaySchedulesError],
    ["dashboard-today-bookings", todayBookingsError],
    ["dashboard-upcoming-schedules", upcomingSchedulesError],
  ] as const) {
    if (error) logError(scope, error);
  }

  const todayBookingCount = (todayBookings ?? []).filter(
    (b: any) => b.schedules?.date === today,
  ).length;

  const schedulesToday = todaySchedules ?? [];
  const areasInUseIds = new Set(schedulesToday.map((s: any) => s.area_id));
  const areasInUseCount = areasInUseIds.size;
  const areasAvailableCount = Math.max((activeAreaCount ?? 0) - areasInUseCount, 0);

  // Conflict detection: overlapping active schedules in the same area today.
  // This should never happen thanks to the DB exclusion constraint, but is
  // surfaced here as an operational sanity check.
  const conflicts = computeScheduleConflicts(schedulesToday as any);

  return (
    <DashboardClient
      areaCount={areaCount ?? 0}
      activeAreaCount={activeAreaCount ?? 0}
      areasInUseCount={areasInUseCount}
      areasAvailableCount={areasAvailableCount}
      todayScheduleCount={schedulesToday.length}
      todayBookingCount={todayBookingCount}
      todayLabel={formatDate(new Date())}
      todaySchedules={schedulesToday as any}
      upcomingSchedules={(upcomingSchedules ?? []) as any}
      conflicts={conflicts as any}
    />
  );
}
