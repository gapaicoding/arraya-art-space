import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { BookingsClient, PAGE_SIZE } from "./bookings-client";

export default async function BookingsPage() {
  const supabase = await createClient();

  const [
    { data: bookings, count, error: bookingsError },
    { data: areas },
    { data: organizers },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, schedules(area_id, date, start_at, end_at, status, areas(name, code))", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      // See organizers/page.tsx for why .range() is avoided here.
      .limit(PAGE_SIZE),
    supabase.from("areas").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("organizers").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("activities").select("*").eq("status", "active").order("name", { ascending: true }),
  ]);
  if (bookingsError) logError("bookings-page-fetch", bookingsError);

  return (
    <BookingsClient
      initialBookings={(bookings as any) ?? []}
      initialCount={count ?? 0}
      areas={areas ?? []}
      organizers={organizers ?? []}
      activities={activities ?? []}
    />
  );
}
