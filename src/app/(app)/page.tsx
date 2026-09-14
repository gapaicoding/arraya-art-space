import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = formatDate(new Date(), "yyyy-MM-dd");

  const [
    { count: areaCount },
    { count: activeAreaCount },
    { data: todaySchedules },
    { data: todayBookings },
    { data: upcomingSchedules },
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
  const conflicts: { a: any; b: any }[] = [];
  const byArea = new Map<string, any[]>();
  for (const s of schedulesToday) {
    const list = byArea.get((s as any).area_id) ?? [];
    list.push(s);
    byArea.set((s as any).area_id, list);
  }
  for (const list of byArea.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (new Date(a.start_at) < new Date(b.end_at) && new Date(b.start_at) < new Date(a.end_at)) {
          conflicts.push({ a, b });
        }
      }
    }
  }

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
