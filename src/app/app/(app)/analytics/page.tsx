import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (currentProfile?.role !== "admin") redirect("/app");

  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const [{ data: areas }, { data: businessHours }] = await Promise.all([
    supabase.from("areas").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("business_hours").select("*"),
  ]);

  const { data: schedules, error: schedulesError } = await supabase
    .from("schedules")
    .select("id, date, start_at, end_at, status, area_id, bookings(status)")
    .gte("date", start)
    .lte("date", end)
    .neq("status", "cancelled");
  if (schedulesError) logError("analytics-page-fetch", schedulesError);

  return (
    <AnalyticsClient
      initialStart={start}
      initialEnd={end}
      initialAreaId={null}
      areas={areas ?? []}
      businessHours={businessHours ?? []}
      initialSchedules={(schedules as any) ?? []}
    />
  );
}
